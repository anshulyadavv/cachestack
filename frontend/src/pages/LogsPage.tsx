// pages/LogsPage.tsx
import React from 'react';
import type { LogEntry } from '../types';

const CMD_COLORS: Record<string, string> = {
  SET: '#fbbf24', GET: '#60a5fa', DEL: '#f87171',
  HSET: '#a78bfa', LPUSH: '#fb923c', SUBSCRIBE: '#4ade80',
};

interface LogsPageProps {
  logs: LogEntry[];
}

export const LogsPage: React.FC<LogsPageProps> = ({ logs }) => (
  <div className="card">
    <div className="card-header">
      <div className="card-label">Command History</div>
      <div className="live-badge">LIVE</div>
    </div>
    <div style={{ maxHeight: 520, overflowY: 'auto' }}>
      {logs.map(log => (
        <div key={log.id} className="log-entry">
          <span className="log-ts">{log.ts}</span>
          <span
            className={`log-cmd ${log.cmd.toLowerCase()}`}
            style={{ color: CMD_COLORS[log.cmd] ?? 'var(--text2)' }}
          >
            {log.cmd}
          </span>
          <span className="log-key">{log.key}</span>
          <span className="log-latency">{log.latency}ms</span>
        </div>
      ))}
    </div>
  </div>
);
