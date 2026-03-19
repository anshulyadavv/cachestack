# DATA_STORE — Full Stack

Redis-like in-memory key-value store with a Go backend and a React + TypeScript dashboard.

```
datastore-project/
├── backend/          ← Go server (TCP + HTTP API)
└── frontend/         ← Vite + React + TypeScript dashboard
```

---

## Quick Start

### 1. Start the backend

```bash
cd backend
go build -o bin/server ./cmd/server
./bin/server -addr :6399 -http :6380
```

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev        # → http://localhost:5173
```

The Vite dev server proxies `/api/*` and `/health` to `localhost:6380` automatically — no CORS config needed.

---

## Frontend — File Map

```
frontend/src/
├── types/
│   └── index.ts            ← All shared TypeScript interfaces
├── api/
│   ├── client.ts           ← fetch wrapper → Go HTTP API
│   └── mock.ts             ← Seed data + generators (offline mode)
├── hooks/
│   ├── useLineChart.ts     ← Chart.js line chart with live update
│   └── useBarChart.ts      ← Chart.js bar chart (read/write split)
├── components/
│   ├── Icon.tsx            ← Inline SVG icon set
│   ├── Sidebar.tsx         ← Left nav
│   ├── Topbar.tsx          ← Header bar + server status badge
│   ├── StatCard.tsx        ← Metric card with sparkline
│   ├── ViewModal.tsx       ← Key view/edit modal
│   └── CommandPalette.tsx  ← Bottom execute bar
├── pages/
│   ├── DashboardPage.tsx   ← Stat cards + live charts + recent logs
│   ├── KeyExplorerPage.tsx ← Table with search/filter/CRUD
│   ├── MetricsPage.tsx     ← CPU, throughput, read/write charts
│   ├── LogsPage.tsx        ← Scrolling command history
│   └── PubSubPage.tsx      ← Channel subscribe + live messages
├── App.tsx                 ← Root: all state, API polling, routing
├── index.css               ← All global styles (CSS variables + classes)
└── main.tsx                ← React entry point
```

---

## Backend — File Map

```
backend/
├── cmd/
│   ├── server/main.go      ← Entry: wires all subsystems, TCP + HTTP
│   └── benchmark/main.go   ← Load tester: latency percentiles
├── config/config.go        ← CLI flags
└── internal/
    ├── store/store.go      ← Hashmap + LRU eviction + TTL + all data types
    ├── parser/parser.go    ← Text protocol parser (quoted strings)
    ├── networking/
    │   ├── server.go       ← TCP listener + command dispatcher
    │   └── http.go         ← JSON REST API (/api/metrics, /api/keys, …)
    ├── persistence/aof.go  ← Append-Only File with replay on restart
    ├── metrics/metrics.go  ← Atomic ops/sec, memory, connection counters
    └── pubsub/broker.go    ← SUBSCRIBE / PUBLISH channel broker
```

---

## Supported Commands (TCP)

| Command | Example |
|---|---|
| `SET key value [EX seconds]` | `SET user:1 Alice EX 60` |
| `GET key` | `GET user:1` |
| `DEL key [key …]` | `DEL user:1 user:2` |
| `EXISTS key` | `EXISTS user:1` |
| `EXPIRE key seconds` | `EXPIRE user:1 300` |
| `TTL key` | `TTL user:1` |
| `KEYS` | `KEYS` |
| `DBSIZE` | `DBSIZE` |
| `FLUSHALL` | `FLUSHALL` |
| `INFO` | `INFO` |
| `LPUSH / RPUSH key val …` | `LPUSH jobs task1 task2` |
| `LPOP key` | `LPOP jobs` |
| `LRANGE key start stop` | `LRANGE jobs 0 -1` |
| `SADD key member …` | `SADD tags go redis` |
| `SMEMBERS key` | `SMEMBERS tags` |
| `ZADD key score member` | `ZADD scores 100 alice` |
| `ZRANGE key start stop` | `ZRANGE scores 0 -1` |
| `SUBSCRIBE channel …` | `SUBSCRIBE events` |
| `UNSUBSCRIBE channel …` | `UNSUBSCRIBE events` |
| `PUBLISH channel message` | `PUBLISH events "hello"` |

---

## HTTP API (Dashboard)

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/metrics` | Live ops/sec, memory, connections |
| GET | `/api/keys` | All keys + TTL |
| DELETE | `/api/keys?key=foo` | Delete a key |
| POST | `/api/exec` | Execute any command `{"cmd":"GET foo"}` |
| GET | `/api/pubsub/channels` | Active channels + subscriber counts |

---

## Benchmark

```bash
cd backend
go build -o bin/benchmark ./cmd/benchmark
./bin/benchmark -clients 100 -requests 1000 -cmd mixed
```
