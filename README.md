# CACHE STACK

> A Redis-compatible in-memory key-value store built from scratch — Go TCP server with AOF persistence, LRU eviction, Pub/Sub, and a live React + TypeScript dashboard with real-time metrics.

<div align="center">

[![GitHub stars](https://img.shields.io/github/stars/YOUR_USERNAME/cachestack?style=social)](https://github.com/YOUR_USERNAME/cachestack/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/YOUR_USERNAME/cachestack?style=social)](https://github.com/YOUR_USERNAME/cachestack/network/members)
[![GitHub issues](https://img.shields.io/github/issues/YOUR_USERNAME/cachestack)](https://github.com/YOUR_USERNAME/cachestack/issues)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

**[⭐ Star this repo](https://github.com/YOUR_USERNAME/cachestack)**

</div>

---

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
│   ├── useBarChart.ts      ← Chart.js bar chart (read/write split)
│   ├── useRegion.ts        ← IP geolocation for dynamic region label
│   └── useNotifications.ts ← Toast notification queue
├── components/
│   ├── Icon.tsx            ← Inline SVG icon set
│   ├── Sidebar.tsx         ← Left nav + GitHub star + copyright
│   ├── Topbar.tsx          ← Header bar + server status + search + notifications
│   ├── StatCard.tsx        ← Metric card with sparkline
│   ├── ViewModal.tsx       ← Key view/edit modal
│   ├── CommandPalette.tsx  ← Bottom execute bar
│   ├── NotificationPanel.tsx ← Bell dropdown panel
│   └── ToastStrip.tsx      ← Floating toast alerts
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
| GET | `/api/keys` | All keys + TTL + type |
| DELETE | `/api/keys?key=foo` | Delete a key |
| GET | `/api/keys/value?key=foo` | Fetch value of a single key |
| POST | `/api/exec` | Execute any command `{"cmd":"GET foo"}` |
| GET | `/api/pubsub/channels` | Active channels + subscriber counts |

---

## Benchmark

```bash
cd backend
go build -o bin/benchmark ./cmd/benchmark
./bin/benchmark -clients 100 -requests 1000 -cmd mixed
```

Sample results (loopback):

```
Requests completed : 100000
Errors             : 0
Throughput         : 5,722 req/s
Latency p50        : 2,335 µs
Latency p99        : 76,858 µs
```

---

<div align="center">

Made with ❤️ by **Anshul**

If this project helped you, consider giving it a ⭐ — it means a lot!

[![GitHub stars](https://img.shields.io/github/stars/YOUR_USERNAME/cachestack?style=social)](https://github.com/YOUR_USERNAME/cachestack/stargazers)

</div>