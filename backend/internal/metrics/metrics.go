// Package metrics provides lightweight runtime counters.
// ops/sec is computed over a sliding 1-second window using atomic counters
// so reads never block writers.
package metrics

import (
	"fmt"
	"sync/atomic"
	"time"
)

// Collector tracks server-wide statistics.
type Collector struct {
	totalOps     atomic.Int64
	opsLastSec   atomic.Int64 // snapshot for the last complete window
	windowOps    atomic.Int64 // ops in the current 1-second window
	totalConns   atomic.Int64
	activeConns  atomic.Int64
	totalErrors  atomic.Int64
	startTime    time.Time
}

// New creates and starts a Collector.
func New() *Collector {
	c := &Collector{startTime: time.Now()}
	go c.windowSweeper()
	return c
}

// RecordOp increments the ops counter.
func (c *Collector) RecordOp() {
	c.totalOps.Add(1)
	c.windowOps.Add(1)
}

// RecordError increments the error counter.
func (c *Collector) RecordError() { c.totalErrors.Add(1) }

// ConnOpen records a new connection.
func (c *Collector) ConnOpen() {
	c.totalConns.Add(1)
	c.activeConns.Add(1)
}

// ConnClose decrements active connections.
func (c *Collector) ConnClose() { c.activeConns.Add(-1) }

// OpsPerSec returns the ops/sec sampled in the last complete window.
func (c *Collector) OpsPerSec() int64 { return c.opsLastSec.Load() }

// TotalOps returns lifetime ops.
func (c *Collector) TotalOps() int64 { return c.totalOps.Load() }

// ActiveConns returns current open connections.
func (c *Collector) ActiveConns() int64 { return c.activeConns.Load() }

// TotalConns returns lifetime connections.
func (c *Collector) TotalConns() int64 { return c.totalConns.Load() }

// TotalErrors returns lifetime error count.
func (c *Collector) TotalErrors() int64 { return c.totalErrors.Load() }

// Uptime returns seconds since server start.
func (c *Collector) Uptime() float64 { return time.Since(c.startTime).Seconds() }

// Summary returns a human-readable stats string (used by INFO command).
func (c *Collector) Summary(keyCount int, bytesUsed int64) string {
	return fmt.Sprintf(
		"uptime_seconds:%.0f\r\nops_per_sec:%d\r\ntotal_ops:%d\r\n"+
			"active_conns:%d\r\ntotal_conns:%d\r\ntotal_errors:%d\r\n"+
			"keys:%d\r\nmem_bytes:%d",
		c.Uptime(), c.OpsPerSec(), c.TotalOps(),
		c.ActiveConns(), c.TotalConns(), c.TotalErrors(),
		keyCount, bytesUsed,
	)
}

// windowSweeper rotates the 1-second ops window.
func (c *Collector) windowSweeper() {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	for range ticker.C {
		snap := c.windowOps.Swap(0)
		c.opsLastSec.Store(snap)
	}
}
