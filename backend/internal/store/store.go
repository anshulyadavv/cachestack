// Package store implements the in-memory key-value engine.
// Design: single RWMutex protects the hash map; LRU is maintained via a
// doubly-linked list so eviction is O(1). TTL uses a lazy-expiry check on
// every read plus a background sweeper for true reclamation.
package store

import (
	"container/list"
	"fmt"
	"math"
	"strconv"
	"sync"
	"time"
)

// ValueType distinguishes the supported data structures.
type ValueType uint8

const (
	TypeString ValueType = iota
	TypeList
	TypeSet
	TypeZSet
)

// Entry is a single stored value with metadata.
type Entry struct {
	vtype   ValueType
	str     string
	list    []string
	set     map[string]struct{}
	zset    map[string]float64 // member → score
	expiresAt time.Time        // zero value means no expiry
	lruElem   *list.Element    // pointer into LRU list
}

func (e *Entry) isExpired() bool {
	return !e.expiresAt.IsZero() && time.Now().After(e.expiresAt)
}

// Store is the main key-value engine.
type Store struct {
	mu       sync.RWMutex
	data     map[string]*Entry
	lruList  *list.List   // front = most recently used
	maxKeys  int          // 0 = unlimited; LRU eviction kicks in otherwise
	byteUsed int64        // approximate memory in bytes
}

// lruItem is stored inside list.Element.Value.
type lruItem struct{ key string }

// New creates a store. maxKeys=0 disables LRU eviction.
func New(maxKeys int) *Store {
	s := &Store{
		data:    make(map[string]*Entry),
		lruList: list.New(),
		maxKeys: maxKeys,
	}
	go s.expirySweeper()
	return s
}

// ---------- String commands ----------

func (s *Store) Set(key, value string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.setLocked(key, &Entry{vtype: TypeString, str: value})
}

func (s *Store) Get(key string) (string, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	e, ok := s.getLocked(key)
	if !ok {
		return "", false
	}
	if e.vtype != TypeString {
		return "", false
	}
	return e.str, true
}

func (s *Store) Del(keys ...string) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	count := 0
	for _, k := range keys {
		if e, ok := s.data[k]; ok {
			s.removeLocked(k, e)
			count++
		}
	}
	return count
}

// ---------- TTL commands ----------

func (s *Store) Expire(key string, d time.Duration) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	e, ok := s.data[key]
	if !ok || e.isExpired() {
		return false
	}
	e.expiresAt = time.Now().Add(d)
	return true
}

func (s *Store) TTL(key string) int64 {
	s.mu.RLock()
	defer s.mu.RUnlock()
	e, ok := s.data[key]
	if !ok {
		return -2 // key does not exist
	}
	if e.expiresAt.IsZero() {
		return -1 // no expiry
	}
	rem := time.Until(e.expiresAt)
	if rem <= 0 {
		return -2
	}
	return int64(rem.Seconds())
}

// ---------- List commands ----------

func (s *Store) LPush(key string, vals ...string) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	e := s.getOrCreateLocked(key, TypeList)
	newList := make([]string, len(vals)+len(e.list))
	// prepend in reverse so first arg ends up at front
	for i, v := range vals {
		newList[len(vals)-1-i] = v
	}
	copy(newList[len(vals):], e.list)
	e.list = newList
	s.touchLRU(e)
	return len(e.list)
}

func (s *Store) RPush(key string, vals ...string) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	e := s.getOrCreateLocked(key, TypeList)
	e.list = append(e.list, vals...)
	s.touchLRU(e)
	return len(e.list)
}

func (s *Store) LPop(key string) (string, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	e, ok := s.getLocked(key)
	if !ok || e.vtype != TypeList || len(e.list) == 0 {
		return "", false
	}
	val := e.list[0]
	e.list = e.list[1:]
	s.touchLRU(e)
	return val, true
}

func (s *Store) LRange(key string, start, stop int) []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	e, ok := s.data[key]
	if !ok || e.vtype != TypeList {
		return nil
	}
	n := len(e.list)
	if start < 0 { start = max(0, n+start) }
	if stop < 0  { stop  = n + stop }
	if stop >= n { stop  = n - 1 }
	if start > stop { return nil }
	cp := make([]string, stop-start+1)
	copy(cp, e.list[start:stop+1])
	return cp
}

// ---------- Set commands ----------

func (s *Store) SAdd(key string, members ...string) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	e := s.getOrCreateLocked(key, TypeSet)
	added := 0
	for _, m := range members {
		if _, exists := e.set[m]; !exists {
			e.set[m] = struct{}{}
			added++
		}
	}
	s.touchLRU(e)
	return added
}

func (s *Store) SMembers(key string) []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	e, ok := s.data[key]
	if !ok || e.vtype != TypeSet {
		return nil
	}
	out := make([]string, 0, len(e.set))
	for m := range e.set {
		out = append(out, m)
	}
	return out
}

// ---------- Sorted set commands ----------

func (s *Store) ZAdd(key string, score float64, member string) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	e := s.getOrCreateLocked(key, TypeZSet)
	_, exists := e.zset[member]
	e.zset[member] = score
	s.touchLRU(e)
	if exists { return 0 }
	return 1
}

// ZRange returns members sorted by score in [start,stop] (0-indexed).
func (s *Store) ZRange(key string, start, stop int) []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	e, ok := s.data[key]
	if !ok || e.vtype != TypeZSet {
		return nil
	}
	type ms struct{ m string; sc float64 }
	sorted := make([]ms, 0, len(e.zset))
	for m, sc := range e.zset {
		sorted = append(sorted, ms{m, sc})
	}
	// simple insertion sort — production would use a skip list
	for i := 1; i < len(sorted); i++ {
		for j := i; j > 0 && sorted[j].sc < sorted[j-1].sc; j-- {
			sorted[j], sorted[j-1] = sorted[j-1], sorted[j]
		}
	}
	n := len(sorted)
	if start < 0 { start = max(0, n+start) }
	if stop < 0  { stop  = n + stop }
	if stop >= n { stop  = n - 1 }
	if start > stop { return nil }
	out := make([]string, stop-start+1)
	for i, item := range sorted[start : stop+1] {
		out[i] = item.m
	}
	return out
}

// ---------- Metrics ----------

func (s *Store) Len() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.data)
}

func (s *Store) BytesUsed() int64 {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.byteUsed
}

// Keys returns a snapshot of all non-expired keys.
func (s *Store) Keys() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]string, 0, len(s.data))
	for k, e := range s.data {
		if !e.isExpired() {
			out = append(out, k)
		}
	}
	return out
}

// ---------- Internal helpers ----------

// getLocked fetches an entry, deleting it if expired. Caller must hold mu.
func (s *Store) getLocked(key string) (*Entry, bool) {
	e, ok := s.data[key]
	if !ok {
		return nil, false
	}
	if e.isExpired() {
		s.removeLocked(key, e)
		return nil, false
	}
	s.touchLRU(e)
	return e, true
}

// setLocked inserts/replaces an entry and evicts if over limit.
func (s *Store) setLocked(key string, e *Entry) {
	if old, ok := s.data[key]; ok {
		s.removeLocked(key, old)
	}
	elem := s.lruList.PushFront(&lruItem{key})
	e.lruElem = elem
	s.data[key] = e
	s.byteUsed += int64(len(key) + entrySize(e))

	// LRU eviction
	if s.maxKeys > 0 {
		for len(s.data) > s.maxKeys {
			s.evictOne()
		}
	}
}

func (s *Store) removeLocked(key string, e *Entry) {
	if e.lruElem != nil {
		s.lruList.Remove(e.lruElem)
	}
	s.byteUsed -= int64(len(key) + entrySize(e))
	if s.byteUsed < 0 { s.byteUsed = 0 }
	delete(s.data, key)
}

func (s *Store) touchLRU(e *Entry) {
	if e.lruElem != nil {
		s.lruList.MoveToFront(e.lruElem)
	}
}

func (s *Store) evictOne() {
	elem := s.lruList.Back()
	if elem == nil { return }
	item := elem.Value.(*lruItem)
	if e, ok := s.data[item.key]; ok {
		s.removeLocked(item.key, e)
	}
}

func (s *Store) getOrCreateLocked(key string, vtype ValueType) *Entry {
	if e, ok := s.data[key]; ok && e.vtype == vtype && !e.isExpired() {
		return e
	}
	e := &Entry{vtype: vtype}
	switch vtype {
	case TypeList:
		e.list = []string{}
	case TypeSet:
		e.set = make(map[string]struct{})
	case TypeZSet:
		e.zset = make(map[string]float64)
	}
	s.setLocked(key, e)
	return s.data[key]
}

// expirySweeper runs in background, cleaning expired keys every 100ms.
func (s *Store) expirySweeper() {
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()
	for range ticker.C {
		s.mu.Lock()
		for k, e := range s.data {
			if e.isExpired() {
				s.removeLocked(k, e)
			}
		}
		s.mu.Unlock()
	}
}

// entrySize returns a rough byte estimate for an entry.
func entrySize(e *Entry) int {
	switch e.vtype {
	case TypeString:
		return len(e.str) + 64
	case TypeList:
		total := 64
		for _, v := range e.list { total += len(v) + 16 }
		return total
	case TypeSet:
		return len(e.set)*32 + 64
	case TypeZSet:
		return len(e.zset)*48 + 64
	}
	return 64
}

func max(a, b int) int {
	if a > b { return a }
	return b
}

// FormatZScore formats a float score for wire output.
func FormatZScore(f float64) string {
	if f == math.Trunc(f) {
		return strconv.FormatInt(int64(f), 10)
	}
	return fmt.Sprintf("%g", f)
}
