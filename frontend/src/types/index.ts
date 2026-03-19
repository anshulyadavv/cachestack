export interface KeyEntry {
  id: number;
  key: string;
  type: 'String' | 'Hash' | 'List' | 'Set' | 'ZSet';
  ttl: string;
  size: string;
  value: string;
}

export interface LogEntry {
  id: number;
  cmd: string;
  key: string;
  latency: string;
  ts: string;
}

export interface PubSubMessage {
  id: number;
  channel: string;
  body: string;
  ts: string;
}

export interface ServerMetrics {
  ops_per_sec: number;
  total_ops: number;
  active_conns: number;
  total_conns: number;
  total_errors: number;
  uptime: number;
  key_count: number;
  mem_bytes: number;
  channels: string[];
}

export interface ApiKeyInfo {
  key: string;
  ttl: number;
  type: string;   // now returned by backend
}

export interface ChannelInfo {
  name: string;
  subscribers: number;
}

export type PageId = 'dashboard' | 'keys' | 'metrics' | 'logs' | 'pubsub';
