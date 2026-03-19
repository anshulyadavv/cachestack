// pages/DashboardPage.tsx
import React, { useRef, useEffect } from 'react';
import { StatCard } from '../components/StatCard';
import { useLineChart } from '../hooks/useLineChart';
import type { LogEntry } from '../types';

interface DashboardPageProps {
  liveOps: number[];
  liveMemTrend: number[];
  totalKeys: number;
  memUsed: number;
  opsPerSec: number;
  logs: LogEntry[];
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  liveOps, liveMemTrend, totalKeys, memUsed, opsPerSec, logs,
}) => {
  const opsCanvasRef = useRef<HTMLCanvasElement>(null);
  const memCanvasRef = useRef<HTMLCanvasElement>(null);
  const updateOps = useLineChart(opsCanvasRef, liveOps, 'Ops/s', '#4ade80');
  const updateMem = useLineChart(memCanvasRef, liveMemTrend, 'MB', '#60a5fa');

  useEffect(() => { updateOps(liveOps); }, [liveOps, updateOps]);
  useEffect(() => { updateMem(liveMemTrend); }, [liveMemTrend, updateMem]);

  return (
    <div>
      <div className="stat-grid">
        <StatCard label="Total Keys"     value={totalKeys >= 1000 ? `${(totalKeys/1000).toFixed(1)}K` : `${totalKeys}`} delta="in store"  color="#4ade80" spark={liveOps.map(v => v * 0.08)} />
        <StatCard label="Memory Usage"   value={`${memUsed} MB`}                      delta="/ 2.0 GB" color="#60a5fa" spark={liveMemTrend} />
        <StatCard label="Ops Per Second" value={`${opsPerSec.toFixed(1)}k`}            delta="ops/s"   color="#fb923c" spark={liveOps} />
      </div>

      <div className="chart-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-header-left">
              <div className="card-label">Real-Time Ops/Sec</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Live-updating from useWebSockets</div>
            </div>
            <div className="live-badge">LIVE</div>
          </div>
          <div className="chart-wrap" style={{ height: 160 }}>
            <canvas ref={opsCanvasRef} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-header-left">
              <div className="card-label">Memory Use Trend</div>
            </div>
            <div className="live-badge">LIVE</div>
          </div>
          <div className="chart-wrap" style={{ height: 160 }}>
            <canvas ref={memCanvasRef} />
          </div>
        </div>
      </div>

      <div className="section-title">Recent Commands</div>
      <div className="card">
        {logs.slice(0, 6).map(log => (
          <div key={log.id} className="log-entry">
            <span className="log-ts">{log.ts}</span>
            <span className={`log-cmd ${log.cmd.toLowerCase()}`}>{log.cmd}</span>
            <span className="log-key">{log.key}</span>
            <span className="log-latency">{log.latency}ms</span>
          </div>
        ))}
      </div>
    </div>
  );
};
