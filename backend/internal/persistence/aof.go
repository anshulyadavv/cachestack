// Package persistence implements an Append-Only File (AOF).
// Design: every mutating command is serialised as a text line and fsynced.
// On startup the file is replayed line-by-line to reconstruct state.
// A background goroutine periodically fsyncs the buffer for durability.
package persistence

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
	"time"
)

// AOF manages the append-only log file.
type AOF struct {
	mu     sync.Mutex
	file   *os.File
	writer *bufio.Writer
	path   string
	fsyncInterval time.Duration
}

// Open opens (or creates) the AOF file at path.
func Open(path string, fsyncInterval time.Duration) (*AOF, error) {
	f, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR|os.O_APPEND, 0644)
	if err != nil {
		return nil, fmt.Errorf("aof open %s: %w", path, err)
	}
	a := &AOF{
		file:          f,
		writer:        bufio.NewWriterSize(f, 64*1024),
		path:          path,
		fsyncInterval: fsyncInterval,
	}
	if fsyncInterval > 0 {
		go a.periodicFsync()
	}
	return a, nil
}

// Append writes a command line to the AOF buffer.
// It is called after every successful mutating command.
func (a *AOF) Append(cmd string, args ...string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	parts := make([]string, 0, 1+len(args))
	parts = append(parts, cmd)
	parts = append(parts, args...)
	line := strings.Join(parts, " ") + "\n"
	_, err := a.writer.WriteString(line)
	if err != nil {
		log.Printf("[AOF] write error: %v", err)
	}
}

// Flush flushes the write buffer and syncs to disk immediately.
func (a *AOF) Flush() {
	a.mu.Lock()
	defer a.mu.Unlock()
	_ = a.writer.Flush()
	_ = a.file.Sync()
}

// Close flushes and closes the file.
func (a *AOF) Close() {
	a.Flush()
	a.file.Close()
}

// Replay reads the AOF file from the beginning and calls handler for each
// command line. Errors in individual lines are logged and skipped.
func (a *AOF) Replay(handler func(line string)) error {
	f, err := os.Open(a.path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil // fresh start
		}
		return fmt.Errorf("aof replay open: %w", err)
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	lineNo := 0
	for scanner.Scan() {
		lineNo++
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		handler(line)
	}
	if err := scanner.Err(); err != nil {
		return fmt.Errorf("aof replay scan at line %d: %w", lineNo, err)
	}
	log.Printf("[AOF] replayed %d commands from %s", lineNo, a.path)
	return nil
}

func (a *AOF) periodicFsync() {
	ticker := time.NewTicker(a.fsyncInterval)
	defer ticker.Stop()
	for range ticker.C {
		a.Flush()
	}
}
