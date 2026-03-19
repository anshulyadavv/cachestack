// Package config holds server configuration loaded from env / flags.
package config

import (
	"flag"
	"time"
)

// Config holds all runtime configuration.
type Config struct {
	Addr          string        // TCP listen address
	AOFPath       string        // path to append-only file
	MaxKeys       int           // 0 = unlimited; >0 enables LRU eviction
	FsyncInterval time.Duration // how often to fsync the AOF
	HTTPAddr      string        // HTTP metrics/API address
}

// Load parses flags and returns a populated Config.
func Load() *Config {
	c := &Config{}
	flag.StringVar(&c.Addr,          "addr",   ":6399",       "TCP listen address")
	flag.StringVar(&c.AOFPath,       "aof",    "datastore.aof","AOF file path")
	flag.IntVar   (&c.MaxKeys,       "maxkeys", 0,             "Max keys (0=unlimited)")
	flag.DurationVar(&c.FsyncInterval,"fsync",  time.Second,   "AOF fsync interval")
	flag.StringVar(&c.HTTPAddr,      "http",   ":6380",       "HTTP API address")
	flag.Parse()
	return c
}
