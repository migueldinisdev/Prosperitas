import React, { useMemo, useRef, useState } from 'react';

interface BarChartProps {
  data: Array<Record<string, number | string>>;
  dataKey: string;
  color?: string;
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  dataKey,
  color = 'rgb(var(--color-app-primary))',
  height = 300,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ label: string; value: number; x: number; y: number } | null>(null);

  const chartWidth = 1000;
  const chartHeight = height;
  const margin = { top: 24, right: 32, bottom: 48, left: 72 };

  const { bars, maxValue, ticks } = useMemo(() => {
    const values = data.map((item) => Number(item[dataKey] ?? 0));
    const maxValue = Math.max(...values, 1);
    const barAreaWidth = chartWidth - margin.left - margin.right;
    const gap = 22;
    const barWidth = (barAreaWidth - gap * (data.length - 1)) / data.length;

    const bars = data.map((item, index) => {
      const value = Number(item[dataKey] ?? 0);
      const height = (value / maxValue) * (chartHeight - margin.top - margin.bottom);
      const x = margin.left + index * (barWidth + gap);
      const y = chartHeight - margin.bottom - height;
      return {
        x,
        y,
        width: barWidth,
        height,
        label: String(item.name ?? ''),
        value,
      };
    });

    const tickCount = 4;
    const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (maxValue / tickCount) * i);

    return { bars, maxValue, ticks };
  }, [chartHeight, chartWidth, data, dataKey, margin.bottom, margin.left, margin.right, margin.top]);

  const projectToContainer = (point: { x: number; y: number }) => {
    if (!chartRef.current) return point;
    const { width, height: boxHeight } = chartRef.current.getBoundingClientRect();
    return {
      x: (point.x / chartWidth) * width,
      y: (point.y / chartHeight) * boxHeight,
    };
  };

  return (
    <div className="w-full relative" style={{ height }} ref={chartRef}>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full">
        <defs>
          <linearGradient id="bar-fill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.95" />
            <stop offset="100%" stopColor={color} stopOpacity="0.7" />
          </linearGradient>
          <filter id="bar-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="rgb(var(--color-app-bg))" floodOpacity="0.4" />
          </filter>
        </defs>

        <rect
          x={margin.left - 24}
          y={margin.top - 12}
          width={chartWidth - margin.left - margin.right + 48}
          height={chartHeight - margin.top - margin.bottom + 20}
          rx={14}
          fill="rgb(var(--color-app-border))"
          opacity="0.25"
        />

        {ticks.map((tick) => {
          const y = chartHeight - margin.bottom - (tick / maxValue) * (chartHeight - margin.top - margin.bottom);
          return (
            <g key={tick}>
              <line
                x1={margin.left - 6}
                x2={chartWidth - margin.right + 6}
                y1={y}
                y2={y}
                stroke="rgb(var(--color-app-border))"
                strokeOpacity="0.6"
                strokeDasharray="4 6"
              />
              <text x={margin.left - 16} y={y + 4} textAnchor="end" fill="rgb(var(--color-app-muted))" fontSize={12}>
                ${tick.toLocaleString()}
              </text>
            </g>
          );
        })}

        {bars.map((bar) => (
          <g key={bar.label}>
            <rect
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              rx={8}
              fill="url(#bar-fill)"
              filter="url(#bar-shadow)"
              onMouseEnter={() =>
                setTooltip({
                  label: bar.label,
                  value: bar.value,
                  ...projectToContainer({ x: bar.x + bar.width / 2, y: bar.y }),
                })
              }
              onMouseLeave={() => setTooltip(null)}
            />
            <text
              x={bar.x + bar.width / 2}
              y={chartHeight - margin.bottom + 24}
              textAnchor="middle"
              fill="rgb(var(--color-app-muted))"
              fontSize={12}
            >
              {bar.label}
            </text>
          </g>
        ))}
      </svg>

      {tooltip && (
        <div
          className="absolute bg-app-card border border-app-border rounded-lg px-3 py-2 shadow-lg text-sm"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -120%)' }}
        >
          <p className="text-app-foreground font-medium">{tooltip.label}</p>
          <p className="text-app-muted">${tooltip.value.toLocaleString()}</p>
        </div>
      )}
    </div>
  );
};
