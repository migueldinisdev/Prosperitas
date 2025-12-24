import React, { useMemo, useRef, useState } from 'react';

interface LineChartProps {
  data: Array<Record<string, number | string>>;
  dataKey: string;
  color?: string;
  height?: number;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  dataKey,
  color = 'rgb(var(--color-app-primary))',
  height = 300,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ label: string; value: number; x: number; y: number } | null>(null);

  const chartWidth = 1000;
  const chartHeight = height;
  const margin = { top: 26, right: 32, bottom: 56, left: 72 };

  const { points, maxValue, minValue, ticks, path } = useMemo(() => {
    const values = data.map((item) => Number(item[dataKey] ?? 0));
    const labels = data.map((item) => String(item.name ?? ''));
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values, 0);
    const range = maxValue - minValue || 1;

    const usableWidth = chartWidth - margin.left - margin.right;
    const usableHeight = chartHeight - margin.top - margin.bottom;

    const points = values.map((value, index) => {
      const x = margin.left + (index / Math.max(values.length - 1, 1)) * usableWidth;
      const y = chartHeight - margin.bottom - ((value - minValue) / range) * usableHeight;
      return { x, y, value, label: labels[index] };
    });

    const tickCount = 4;
    const ticks = Array.from({ length: tickCount + 1 }, (_, i) => minValue + (range / tickCount) * i);

    const path = points
      .map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');

    return { points, maxValue, minValue, ticks, path };
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
          <linearGradient id="line-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.16" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
          <filter id="point-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor={color} floodOpacity="0.35" />
          </filter>
        </defs>

        <rect
          x={margin.left - 24}
          y={margin.top - 12}
          width={chartWidth - margin.left - margin.right + 48}
          height={chartHeight - margin.top - margin.bottom + 24}
          rx={14}
          fill="rgb(var(--color-app-border))"
          opacity="0.25"
        />

        {ticks.map((tick) => {
          const y = chartHeight - margin.bottom - ((tick - minValue) / (maxValue - minValue || 1)) * (chartHeight - margin.top - margin.bottom);
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

        <path
          d={
            points.length
              ? `${path} L ${points[points.length - 1].x} ${chartHeight - margin.bottom} L ${points[0].x} ${
                  chartHeight - margin.bottom
                } Z`
              : ''
          }
          fill="url(#line-gradient)"
        />
        <path d={path} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />

        {points.map((point) => (
          <g key={point.label + point.value}>
            <circle
              cx={point.x}
              cy={point.y}
              r={6}
              fill="rgb(var(--color-app-bg))"
              stroke={color}
              strokeWidth={3}
              filter="url(#point-shadow)"
              onMouseEnter={() =>
                setTooltip({
                  label: point.label,
                  value: point.value,
                  ...projectToContainer({ x: point.x, y: point.y }),
                })
              }
              onMouseLeave={() => setTooltip(null)}
            />
            <text
              x={point.x}
              y={chartHeight - margin.bottom + 26}
              textAnchor="middle"
              fill="rgb(var(--color-app-muted))"
              fontSize={12}
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>

      {tooltip && (
        <div
          className="absolute bg-app-card border border-app-border rounded-lg px-3 py-2 shadow-lg text-sm"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -140%)' }}
        >
          <p className="text-app-foreground font-medium">{tooltip.label}</p>
          <p className="text-app-muted">${tooltip.value.toLocaleString()}</p>
        </div>
      )}
    </div>
  );
};
