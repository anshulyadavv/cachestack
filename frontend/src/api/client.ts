// api/client.ts
// Thin fetch wrapper. Returns null on any error → callers fall back to mock data.
import type { ServerMetrics, ApiKeyInfo, ChannelInfo } from '../types';

export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:6380';

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(API_BASE + path, {
      ...opts,
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const api = {
  health: () => apiFetch<{ status: string; time: string }>('/health'),

  metrics: () => apiFetch<ServerMetrics>('/api/metrics'),

  keys: () => apiFetch<ApiKeyInfo[]>('/api/keys'),

  deleteKey: (key: string) =>
    apiFetch<{ deleted: number }>(`/api/keys?key=${encodeURIComponent(key)}`, {
      method: 'DELETE',
    }),

  exec: (cmd: string) =>
    apiFetch<{ result?: string; error?: string }>('/api/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cmd }),
    }),

  channels: () => apiFetch<ChannelInfo[]>('/api/pubsub/channels'),
};
