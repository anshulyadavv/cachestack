// components/StatCard.tsx
import React, { useRef, useEffect, memo } from 'react';
import { useLineChart } from '../hooks/useLineChart';

interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  color: string;
  spark: number[];
}

export const StatCard: React.FC<StatCardProps> = memo(({ label, value, delta, color, spark }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const update = useLineChart(canvasRef, spark, label, color);

  useEffect(() => { update(spark); }, [spark, update]);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <div className="card-header-left">
          <div className="card-label">{label}</div>
          <div className="card-value">{value}</div>
          {delta && <div className="card-delta">{delta}</div>}
        </div>
        <div className="card-dots">
          <span /><span /><span />
        </div>
      </div>
      <div className="card-body">
        <div className="chart-wrap" style={{ height: 80, padding: '8px 0 0 0' }}>
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
});
