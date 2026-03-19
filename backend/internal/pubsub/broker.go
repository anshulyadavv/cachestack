// Package pubsub implements a simple fan-out pub/sub broker.
// Design: a Broker holds a map of channel → set of subscriber channels.
// SUBSCRIBE gives the caller a Go channel to receive messages on.
// PUBLISH fans out to every subscriber's channel non-blocking (drops if full).
package pubsub

import (
	"sync"
)

const subscriberBufSize = 256

// Message is delivered to subscribers.
type Message struct {
	Channel string
	Payload string
}

// Broker manages channel subscriptions.
type Broker struct {
	mu   sync.RWMutex
	subs map[string]map[chan Message]struct{}
}

// New creates a Broker.
func New() *Broker {
	return &Broker{subs: make(map[string]map[chan Message]struct{})}
}

// Subscribe registers interest in channel and returns a receive-only chan.
// The caller must call Unsubscribe when done to avoid goroutine/memory leaks.
func (b *Broker) Subscribe(channel string) <-chan Message {
	ch := make(chan Message, subscriberBufSize)
	b.mu.Lock()
	if b.subs[channel] == nil {
		b.subs[channel] = make(map[chan Message]struct{})
	}
	b.subs[channel][ch] = struct{}{}
	b.mu.Unlock()
	return ch
}

// Unsubscribe removes a subscriber. Safe to call multiple times.
func (b *Broker) Unsubscribe(channel string, ch <-chan Message) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if chans, ok := b.subs[channel]; ok {
		for c := range chans {
			if c == ch {
				delete(chans, c)
				close(c)
				break
			}
		}
		if len(chans) == 0 {
			delete(b.subs, channel)
		}
	}
}

// Publish delivers payload to all subscribers of channel.
// Returns the number of subscribers that received the message.
func (b *Broker) Publish(channel, payload string) int {
	b.mu.RLock()
	defer b.mu.RUnlock()
	chans := b.subs[channel]
	count := 0
	msg := Message{Channel: channel, Payload: payload}
	for ch := range chans {
		select {
		case ch <- msg:
			count++
		default:
			// subscriber is slow — drop rather than block publisher
		}
	}
	return count
}

// ActiveChannels returns the names of channels with ≥1 subscriber.
func (b *Broker) ActiveChannels() []string {
	b.mu.RLock()
	defer b.mu.RUnlock()
	out := make([]string, 0, len(b.subs))
	for ch := range b.subs {
		out = append(out, ch)
	}
	return out
}

// SubscriberCount returns how many clients are subscribed to channel.
func (b *Broker) SubscriberCount(channel string) int {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return len(b.subs[channel])
}
