// pages/MetricsPage.tsx
import React, { useRef, useEffect } from 'react';
import { useLineChart } from '../hooks/useLineChart';
import { useBarChart } from '../hooks/useBarChart';

interface MetricsPageProps {
  liveOps: number[];
  liveMemTrend: number[];
  cpu: number;
  throughput: number;
  activeConns?: number;
}

export const MetricsPage: React.FC<MetricsPageProps> = ({
  liveOps, liveMemTrend, cpu, throughput, activeConns = 142,
}) => {
  const opsCanvasRef = useRef<HTMLCanvasElement>(null);
  const memCanvasRef = useRef<HTMLCanvasElement>(null);
  const barCanvasRef = useRef<HTMLCanvasElement>(null);

  const updateOps = useLineChart(opsCanvasRef, liveOps, 'Ops/s', '#4ade80');
  const updateMem = useLineChart(memCanvasRef, liveMemTrend, 'MB', '#60a5fa');
  const updateBar = useBarChart(barCanvasRef);

  const barDataRef = useRef({
    d1: Array(14).fill(0).map(() => Math.random() * 100),
    d2: Array(14).fill(0).map(() => Math.random() * 60),
  });

  useEffect(() => { updateOps(liveOps); }, [liveOps, updateOps]);
  useEffect(() => { updateMem(liveMemTrend); }, [liveMemTrend, updateMem]);
  useEffect(() => {
    const d1 = [...barDataRef.current.d1.slice(1), Math.random() * 100];
    const d2 = [...barDataRef.current.d2.slice(1), Math.random() * 60];
    barDataRef.current = { d1, d2 };
    updateBar(d1, d2);
  }, [liveOps, updateBar]);

  const cpuColor = cpu > 80 ? 'var(--red)' : cpu > 60 ? 'var(--yellow)' : 'var(--accent)';

  return (
    <div>
      <div className="metrics-grid">
        <div className="metric-stat">
          <div className="metric-stat-label">CPU Usage</div>
          <div className="metric-stat-val">{cpu}%</div>
          <div className="metric-stat-sub">Across 3 cores</div>
          <div className="metric-bar">
            <div className="metric-bar-fill" style={{ width: `${cpu}%`, background: cpuColor }} />
          </div>
        </div>

        <div className="metric-stat">
          <div className="metric-stat-label">Throughput</div>
          <div className="metric-stat-val">{throughput.toFixed(1)} GB/s</div>
          <div className="metric-stat-sub">Network I/O</div>
          <div className="metric-bar">
            <div className="metric-bar-fill" style={{ width: `${Math.min(throughput / 10 * 100, 100)}%`, background: 'var(--blue)' }} />
          </div>
        </div>

        <div className="metric-stat">
          <div className="metric-stat-label">Connected Clients</div>
          <div className="metric-stat-val">{activeConns}</div>
          <div className="metric-stat-sub">+3 in last 60s</div>
          <div className="metric-bar">
            <div className="metric-bar-fill" style={{ width: '71%', background: 'var(--purple)' }} />
          </div>
        </div>

        <div className="metric-stat">
          <div className="metric-stat-label">P99 Latency</div>
          <div className="metric-stat-val">0.41ms</div>
          <div className="metric-stat-sub">Within SLA</div>
          <div className="metric-bar">
            <div className="metric-bar-fill" style={{ width: '14%', background: 'var(--orange)' }} />
          </div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-header-left">
              <div className="card-label">Ops/Sec Live</div>
            </div>
            <div className="live-badge">LIVE</div>
          </div>
          <div className="chart-wrap" style={{ height: 140 }}>
            <canvas ref={opsCanvasRef} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-header-left">
              <div className="card-label">Memory Trend</div>
            </div>
            <div className="live-badge">LIVE</div>
          </div>
          <div className="chart-wrap" style={{ height: 140 }}>
            <canvas ref={memCanvasRef} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-header-left">
            <div className="card-label">Read/Write Distribution</div>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text3)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#60a5fa55', border: '1px solid #60a5fa', display: 'inline-block' }} />
              Reads
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#4ade8088', border: '1px solid #4ade80', display: 'inline-block' }} />
              Writes
            </span>
          </div>
        </div>
        <div className="chart-wrap" style={{ height: 140 }}>
          <canvas ref={barCanvasRef} />
        </div>
      </div>
    </div>
  );
};
