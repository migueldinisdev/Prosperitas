import React, { useMemo, useRef, useState } from 'react';

interface PieChartProps {
  data: { name: string; value: number; color: string }[];
  height?: number;
}

interface ArcSegment {
  path: string;
  color: string;
  label: string;
  value: number;
  midpoint: { x: number; y: number };
}

export const PieChart: React.FC<PieChartProps> = ({ data, height = 300 }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ label: string; value: number; x: number; y: number } | null>(null);

  const chartWidth = 1000;
  const chartHeight = height;
  const radius = Math.min(chartWidth, chartHeight * 2) / 3.4;
  const center = { x: chartWidth / 2, y: chartHeight / 2 };

  const segments = useMemo<ArcSegment[]>(() => {
    const total = data.reduce((acc, item) => acc + item.value, 0) || 1;
    let startAngle = -Math.PI / 2;

    return data.map((item) => {
      const angle = (item.value / total) * Math.PI * 2;
      const endAngle = startAngle + angle;

      const start = {
        x: center.x + radius * Math.cos(startAngle),
        y: center.y + radius * Math.sin(startAngle),
      };
      const end = {
        x: center.x + radius * Math.cos(endAngle),
        y: center.y + radius * Math.sin(endAngle),
      };

      const largeArcFlag = angle > Math.PI ? 1 : 0;

      const path = [
        `M ${center.x} ${center.y}`,
        `L ${start.x} ${start.y}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
        'Z',
      ].join(' ');

      const midAngle = startAngle + angle / 2;
      const midpoint = {
        x: center.x + (radius * 0.7) * Math.cos(midAngle),
        y: center.y + (radius * 0.7) * Math.sin(midAngle),
      };

      startAngle = endAngle;

      return {
        path,
        color: item.color,
        label: item.name,
        value: item.value,
        midpoint,
      };
    });
  }, [center.x, center.y, data, radius]);

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
          <filter id="segment-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="6" stdDeviation="12" floodColor="rgb(var(--color-app-bg))" floodOpacity="0.35" />
          </filter>
        </defs>

        <circle
          cx={center.x}
          cy={center.y}
          r={radius + 24}
          fill="rgb(var(--color-app-border))"
          opacity="0.25"
        />

        {segments.map((segment) => (
          <path
            key={segment.label}
            d={segment.path}
            fill={segment.color}
            filter="url(#segment-shadow)"
            onMouseEnter={() =>
              setTooltip({
                label: segment.label,
                value: segment.value,
                ...projectToContainer(segment.midpoint),
              })
            }
            onMouseLeave={() => setTooltip(null)}
          />
        ))}

        <circle cx={center.x} cy={center.y} r={radius * 0.45} fill="rgb(var(--color-app-bg))" />

        <text x={center.x} y={center.y - 4} textAnchor="middle" fill="rgb(var(--color-app-muted))" fontSize={14}>
          Total
        </text>
        <text
          x={center.x}
          y={center.y + 18}
          textAnchor="middle"
          fill="rgb(var(--color-app-foreground))"
          fontSize={18}
          fontWeight={600}
        >
          $
          {data.reduce((acc, item) => acc + item.value, 0).toLocaleString()}
        </text>

        {segments.map((segment, index) => {
          const legendX = chartWidth / 2 - (segments.length * 180) / 2 + index * 180;
          const legendY = chartHeight - 22;
          return (
            <g key={`${segment.label}-legend`}>
              <rect x={legendX} y={legendY - 12} width={12} height={12} rx={4} fill={segment.color} />
              <text x={legendX + 18} y={legendY - 2} fill="rgb(var(--color-app-muted))" fontSize={12}>
                {segment.label}
              </text>
            </g>
          );
        })}
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
