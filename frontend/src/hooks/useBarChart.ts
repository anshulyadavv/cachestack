// hooks/useBarChart.ts
import { useEffect, useRef, useCallback } from 'react';
import Chart from 'chart.js/auto';

export function useBarChart(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Array(14).fill(''),
        datasets: [
          {
            data: Array(14).fill(0).map(() => Math.random() * 100),
            backgroundColor: '#60a5fa55',
            hoverBackgroundColor: '#60a5fa',
            borderRadius: 2,
            borderWidth: 0,
          },
          {
            data: Array(14).fill(0).map(() => Math.random() * 50),
            backgroundColor: '#4ade8088',
            hoverBackgroundColor: '#4ade80',
            borderRadius: 2,
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: '#18181b',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            titleColor: '#8e8e9e',
            bodyColor: '#e8e8ed',
            bodyFont: { family: "'IBM Plex Mono'" },
            padding: 8,
          },
        },
        scales: {
          x: { display: false },
          y: {
            display: true,
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: {
              color: '#5c5c6e',
              font: { family: "'IBM Plex Mono'", size: 9 },
              maxTicksLimit: 4,
            },
            border: { display: false },
          },
        },
      },
    });
    return () => { chartRef.current?.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback((d1: number[], d2: number[]) => {
    if (!chartRef.current) return;
    chartRef.current.data.datasets[0].data = d1;
    chartRef.current.data.datasets[1].data = d2;
    chartRef.current.update('none');
  }, []);

  return update;
}
