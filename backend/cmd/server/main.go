// cmd/server/main.go — entry point for the DATA_STORE server.
package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"datastore/config"
	"datastore/internal/metrics"
	"datastore/internal/networking"
	"datastore/internal/parser"
	"datastore/internal/persistence"
	"datastore/internal/pubsub"
	"datastore/internal/store"
)

func main() {
	log.SetFlags(log.Ldate | log.Ltime | log.Lmicroseconds)
	log.SetPrefix("[datastore] ")

	cfg := config.Load()

	st     := store.New(cfg.MaxKeys)
	broker := pubsub.New()
	met    := metrics.New()

	aof, err := persistence.Open(cfg.AOFPath, cfg.FsyncInterval)
	if err != nil {
		log.Fatalf("could not open AOF: %v", err)
	}
	defer aof.Close()

	srv := &networking.Server{
		Addr:    cfg.Addr,
		Store:   st,
		AOF:     aof,
		Metrics: met,
		Broker:  broker,
	}

	// --- Replay AOF: actually execute every stored command ---
	log.Printf("replaying AOF from %s ...", cfg.AOFPath)
	replayed, replayErrors := 0, 0
	if err := aof.Replay(func(line string) {
		cmd, err := parser.Parse(line)
		if err != nil {
			replayErrors++
			return
		}
		noop      := func(string) {}
		emptySubs := make(map[string]<-chan pubsub.Message)
		srv.Dispatch(cmd, emptySubs, noop)
		replayed++
	}); err != nil {
		log.Printf("AOF replay warning: %v", err)
	}
	log.Printf("replay complete: %d commands restored, %d skipped", replayed, replayErrors)

	// --- HTTP dashboard API (non-blocking) ---
	srv.StartHTTP(cfg.HTTPAddr)

	// --- Graceful shutdown ---
	go func() {
		sig := make(chan os.Signal, 1)
		signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
		<-sig
		log.Printf("shutdown signal received — flushing AOF...")
		aof.Flush()
		os.Exit(0)
	}()

	// --- TCP server (blocking) ---
	log.Printf("starting TCP server on %s", cfg.Addr)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
