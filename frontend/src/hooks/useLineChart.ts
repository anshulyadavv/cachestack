// hooks/useLineChart.ts
import { useEffect, useRef, useCallback } from 'react';
import Chart from 'chart.js/auto';

export function useLineChart(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  initialData: number[],
  label: string,
  color: string,
) {
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array(initialData.length).fill(''),
        datasets: [{
          label,
          data: [...initialData],
          borderColor: color,
          borderWidth: 1.5,
          fill: true,
          backgroundColor: `${color}18`,
          tension: 0.4,
          pointRadius: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
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

  const update = useCallback((vals: number[]) => {
    if (!chartRef.current) return;
    chartRef.current.data.datasets[0].data = vals;
    chartRef.current.update('none');
  }, []);

  return update;
}
