import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { Flame } from 'lucide-react';
import { CalorieLog } from '../types';

interface CalorieChartProps {
  calorieLogs: CalorieLog[];
  maxDailyCalories: number;
}

export const CalorieChart: React.FC<CalorieChartProps> = ({ calorieLogs, maxDailyCalories }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Group logs by Day (YYYY-MM-DD)
    const dailyMap: { [day: string]: { food: number; exercise: number } } = {};

    // Collect dates from the last 14 days or from logs
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayKey = d.toISOString().split('T')[0];
      dailyMap[dayKey] = { food: 0, exercise: 0 };
    }

    calorieLogs.forEach((log) => {
      if (!log.date) return;
      const dayKey = log.date.substring(0, 10);
      if (!dailyMap[dayKey]) {
        dailyMap[dayKey] = { food: 0, exercise: 0 };
      }
      const kcal = Number(log.kcal) || 0;
      if (log.type === 'Food consumed') {
        dailyMap[dayKey].food += kcal;
      } else {
        dailyMap[dayKey].exercise += kcal;
      }
    });

    const sortedDays = Object.keys(dailyMap).sort().slice(-14);

    const labels = sortedDays.map((dayStr) => {
      const parts = dayStr.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
    });

    const netCalorieValues = sortedDays.map((dayStr) => {
      const item = dailyMap[dayStr];
      return item.food - item.exercise;
    });

    const thresholdValues = sortedDays.map(() => maxDailyCalories);

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Daily Net Calories (Food - Burn)',
            data: netCalorieValues,
            borderColor: '#f59e0b', // amber-500
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointBackgroundColor: netCalorieValues.map((v) => (v > maxDailyCalories ? '#ef4444' : '#f59e0b')),
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4.5,
            pointHoverRadius: 6,
          },
          {
            label: `Max Cap (${maxDailyCalories} kcal)`,
            data: thresholdValues,
            borderColor: '#f43f5e', // rose-500
            borderWidth: 1.5,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 12,
              usePointStyle: true,
              font: { family: 'Plus Jakarta Sans', size: 11, weight: 'bold' },
              color: '#475569',
            },
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleFont: { family: 'Plus Jakarta Sans', size: 12 },
            bodyFont: { family: 'JetBrains Mono', size: 12 },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                const val = context.parsed.y ?? 0;
                return ` ${context.dataset.label}: ${val} kcal`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'Plus Jakarta Sans', size: 11, weight: 'bold' },
              color: '#64748b',
            },
          },
          y: {
            grid: { color: '#f1f5f9' },
            ticks: {
              font: { family: 'JetBrains Mono', size: 10 },
              color: '#94a3b8',
              callback: (value) => `${value} kcal`,
            },
            beginAtZero: true,
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [calorieLogs, maxDailyCalories]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col h-[380px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Calorie Trend Timeline</h3>
            <p className="text-[11px] text-slate-400">Continuous 14-Day Daily Net Balance vs Cap</p>
          </div>
        </div>
      </div>

      <div className="relative flex-1 w-full min-h-0">
        <canvas ref={canvasRef} id="canvas-calorie-chart" />
      </div>
    </div>
  );
};
