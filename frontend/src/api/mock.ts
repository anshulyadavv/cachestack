// api/mock.ts — static seed data + generators for offline / demo mode
import type { KeyEntry, LogEntry, PubSubMessage } from '../types';

export const INITIAL_KEYS: KeyEntry[] = [
  { id: 1,  key: 'user:101',         type: 'String', ttl: '20s',    size: '1.2M', value: '{"id":101,"name":"Arjun Mehra","email":"arjun@example.com","plan":"pro"}' },
  { id: 2,  key: 'config:app',       type: 'Hash',   ttl: '∞',     size: '20 MB', value: '{"theme":"dark","lang":"en","debug":false,"version":"3.1.2"}' },
  { id: 3,  key: 'session:9aFb',     type: 'Hash',   ttl: '21s',   size: '3.5K',  value: '{"uid":202,"token":"x7kP2mNqRs","ip":"10.0.0.42","ua":"Mozilla/5.0"}' },
  { id: 4,  key: 'queue:jobs',       type: 'List',   ttl: '∞',     size: '840B',  value: '["job_1001","job_1002","job_1003","job_1004"]' },
  { id: 5,  key: 'cache:products',   type: 'String', ttl: '300s',  size: '98K',   value: '[{"id":1,"name":"Laptop","price":1299},{"id":2,"name":"Phone","price":799}]' },
  { id: 6,  key: 'rate:192.168.1.1', type: 'String', ttl: '60s',   size: '8B',    value: '42' },
  { id: 7,  key: 'leaderboard',      type: 'ZSet',   ttl: '∞',     size: '5.1K',  value: '{"scores":{"player_a":9800,"player_b":8420,"player_c":7100}}' },
  { id: 8,  key: 'tags:popular',     type: 'Set',    ttl: '∞',     size: '280B',  value: '["redis","cache","performance","nosql","realtime"]' },
  { id: 9,  key: 'stats:daily',      type: 'Hash',   ttl: '86400s',size: '1.2K',  value: '{"requests":184232,"errors":12,"p99_ms":45,"uptime_pct":99.98}' },
  { id: 10, key: 'pubsub:events',    type: 'String', ttl: '∞',     size: '256B',  value: '{"last_event":"user_login","subscribers":14}' },
  { id: 11, key: 'auth:token:xK9m', type: 'String', ttl: '3600s', size: '128B',  value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo1OH0.demotoken' },
  { id: 12, key: 'geo:stores',       type: 'ZSet',   ttl: '∞',     size: '2.8K',  value: '{"Delhi":{"lat":28.61,"lon":77.20},"Mumbai":{"lat":19.07,"lon":72.87}}' },
];

const CMD_POOL = [
  { cmd: 'SET',       keys: ['user:101', 'cache:products', 'rate:192.168.1.1'], lat: () => (Math.random() * 0.4 + 0.1).toFixed(2) },
  { cmd: 'GET',       keys: ['session:9aFb', 'config:app', 'stats:daily'],      lat: () => (Math.random() * 0.2 + 0.05).toFixed(2) },
  { cmd: 'DEL',       keys: ['cache:old', 'session:expired'],                   lat: () => (Math.random() * 0.15 + 0.05).toFixed(2) },
  { cmd: 'HSET',      keys: ['config:app', 'stats:daily'],                      lat: () => (Math.random() * 0.3 + 0.1).toFixed(2) },
  { cmd: 'LPUSH',     keys: ['queue:jobs', 'queue:emails'],                     lat: () => (Math.random() * 0.25 + 0.08).toFixed(2) },
  { cmd: 'SUBSCRIBE', keys: ['events_core', 'notifications'],                   lat: () => (Math.random() * 0.1 + 0.02).toFixed(2) },
];

const PUBSUB_PAYLOADS = [
  '{"type":"user_login","uid":101,"ts":1710850571}',
  '{"type":"cluster_health","status":"ok","nodes":3}',
  '{"event":"payment","amount":299,"currency":"INR"}',
  '{"alert":"high_mem","pct":87,"instance":"instance_01"}',
  '{"type":"session_expire","session_id":"9aFb"}',
  '{"action":"cache_miss","key":"products:v2","latency_ms":12}',
  '{"type":"rate_limit","ip":"10.0.2.1","hits":142}',
  '{"event":"job_complete","job_id":"job_1001","duration_ms":234}',
];

export const ALL_CHANNELS = ['events_core', 'notifications', 'alerts', 'global', 'system'];

function nowTime(): string {
  return new Date().toTimeString().slice(0, 8);
}

export function genLogEntry(): LogEntry {
  const pool = CMD_POOL[Math.floor(Math.random() * CMD_POOL.length)];
  const key  = pool.keys[Math.floor(Math.random() * pool.keys.length)];
  return { id: Date.now() + Math.random(), cmd: pool.cmd, key, latency: pool.lat(), ts: nowTime() };
}

export function genPubSubMsg(channels: string[]): PubSubMessage {
  const ch   = channels.length > 0 ? channels[Math.floor(Math.random() * channels.length)] : 'global';
  const body = PUBSUB_PAYLOADS[Math.floor(Math.random() * PUBSUB_PAYLOADS.length)];
  return { id: Date.now() + Math.random(), channel: ch, body, ts: nowTime() };
}

export function seedLogEntries(n = 12): LogEntry[] {
  return Array.from({ length: n }, () => genLogEntry());
}
