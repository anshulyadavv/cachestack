// http.go — JSON REST API for the React dashboard.
// Runs on a separate port alongside the TCP server.
// Allows the frontend to poll /api/metrics, manage keys, and execute commands.
package networking

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"datastore/internal/pubsub"
)

// StartHTTP starts the HTTP API server in a background goroutine.
func (s *Server) StartHTTP(addr string) {
	mux := http.NewServeMux()
	mux.HandleFunc("/health",              s.cors(s.handleHealth))
	mux.HandleFunc("/api/metrics",         s.cors(s.handleMetrics))
	mux.HandleFunc("/api/keys",            s.cors(s.handleKeys))
	mux.HandleFunc("/api/exec",            s.cors(s.handleExec))
	mux.HandleFunc("/api/pubsub/channels", s.cors(s.handleChannels))

	log.Printf("[http] dashboard API on %s", addr)
	go func() {
		if err := http.ListenAndServe(addr, mux); err != nil {
			log.Printf("[http] error: %v", err)
		}
	}()
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, map[string]any{
		"status": "ok",
		"time":   time.Now().Format(time.RFC3339),
	})
}

func (s *Server) handleMetrics(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, map[string]any{
		"ops_per_sec":  s.Metrics.OpsPerSec(),
		"total_ops":    s.Metrics.TotalOps(),
		"active_conns": s.Metrics.ActiveConns(),
		"total_conns":  s.Metrics.TotalConns(),
		"total_errors": s.Metrics.TotalErrors(),
		"uptime":       s.Metrics.Uptime(),
		"key_count":    s.Store.Len(),
		"mem_bytes":    s.Store.BytesUsed(),
		"channels":     s.Broker.ActiveChannels(),
	})
}

func (s *Server) handleKeys(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		keys := s.Store.Keys()
		type keyInfo struct {
			Key string `json:"key"`
			TTL int64  `json:"ttl"`
		}
		out := make([]keyInfo, len(keys))
		for i, k := range keys {
			out[i] = keyInfo{Key: k, TTL: s.Store.TTL(k)}
		}
		writeJSON(w, out)

	case http.MethodDelete:
		key := r.URL.Query().Get("key")
		if key == "" {
			http.Error(w, "missing ?key= param", 400)
			return
		}
		n := s.Store.Del(key)
		s.AOF.Append("DEL", key)
		writeJSON(w, map[string]any{"deleted": n})

	default:
		http.Error(w, "method not allowed", 405)
	}
}

func (s *Server) handleExec(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", 405)
		return
	}
	var body struct {
		Cmd string `json:"cmd"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad json: "+err.Error(), 400)
		return
	}
	body.Cmd = strings.TrimSpace(body.Cmd)
	if body.Cmd == "" {
		http.Error(w, "empty cmd", 400)
		return
	}

	cmd, err := parseHTTPCommand(body.Cmd)
	if err != nil {
		writeJSON(w, map[string]string{"error": err.Error()})
		return
	}

	// HTTP exec doesn't support pub/sub streaming — use an empty subs map.
	noop := func(string) {}
	emptySubs := make(map[string]<-chan pubsub.Message)
	resp := s.dispatch(cmd, emptySubs, noop)
	writeJSON(w, map[string]string{"result": resp})
}

func (s *Server) handleChannels(w http.ResponseWriter, _ *http.Request) {
	channels := s.Broker.ActiveChannels()
	type chanInfo struct {
		Name        string `json:"name"`
		Subscribers int    `json:"subscribers"`
	}
	out := make([]chanInfo, len(channels))
	for i, ch := range channels {
		out[i] = chanInfo{Name: ch, Subscribers: s.Broker.SubscriberCount(ch)}
	}
	writeJSON(w, out)
}

func (s *Server) cors(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(204)
			return
		}
		h(w, r)
	}
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("[http] encode error: %v", err)
	}
}
