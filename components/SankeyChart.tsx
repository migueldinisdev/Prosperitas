import React, { useMemo, useRef, useState } from 'react';

interface SankeyData {
  income: number;
  expenses: Array<{ category: string; value: number }>;
  savings: number;
}

interface SankeyChartProps {
  data: SankeyData;
  height?: number;
}

interface FlowPoint {
  x: number;
  y: number;
}

interface FlowLink {
  source: string;
  target: string;
  value: number;
  path: string;
  center: FlowPoint;
  color: string;
}

export const SankeyChart: React.FC<SankeyChartProps> = ({ data, height = 480 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ label: string; value: number; x: number; y: number } | null>(null);

  const viewBoxWidth = 1000;
  const viewBoxHeight = height;
  const marginX = 80;
  const marginY = 40;

  const { links, nodes, total } = useMemo(() => {
    const flowValueTotal = data.expenses.reduce((acc, exp) => acc + exp.value, 0) + data.savings;
    const total = Math.max(flowValueTotal, data.income);
    const flowHeight = viewBoxHeight - marginY * 2;
    const scale = flowHeight / total;

    const incomeNode = {
      id: 'Income',
      x: marginX,
      y: marginY,
      width: 18,
      height: data.income * scale,
      color: 'rgb(var(--color-app-primary))',
    };

    const expenseNodes = data.expenses.map((exp, index) => {
      const height = exp.value * scale;
      const previousHeight = data.expenses.slice(0, index).reduce((acc, item) => acc + item.value * scale, 0);

      return {
        id: exp.category,
        x: viewBoxWidth * 0.45,
        y: marginY + previousHeight + index * 12,
        width: 14,
        height,
        color: '#ef4444',
        rawValue: exp.value,
      };
    });

    const savingsNodeStart = data.expenses.reduce((acc, exp) => acc + exp.value * scale, 0) + data.expenses.length * 12;
    const savingsNode = {
      id: 'Savings',
      x: viewBoxWidth * 0.8,
      y: marginY + savingsNodeStart,
      width: 18,
      height: data.savings * scale,
      color: '#10b981',
    };

    const allNodes = [incomeNode, ...expenseNodes, savingsNode];

    const buildPath = (from: FlowPoint, to: FlowPoint) => {
      const controlOffset = viewBoxWidth * 0.12;
      return `
        M ${from.x} ${from.y}
        C ${from.x + controlOffset} ${from.y},
          ${to.x - controlOffset} ${to.y},
          ${to.x} ${to.y}
      `;
    };

    let incomeOffset = 0;
    const expenseLinks: FlowLink[] = expenseNodes.map((node) => {
      const thickness = node.height;
      const startY = incomeNode.y + incomeOffset + thickness / 2;
      incomeOffset += thickness;
      const start: FlowPoint = { x: incomeNode.x + incomeNode.width, y: startY };
      const end: FlowPoint = { x: node.x, y: node.y + node.height / 2 };

      return {
        source: incomeNode.id,
        target: node.id,
        value: node.rawValue,
        path: buildPath(start, end),
        center: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
        color: node.color,
      };
    });

    const savingsStartY = incomeNode.y + incomeOffset + data.savings * scale / 2 + data.expenses.length * 12;
    const savingsLinkThickness = savingsNode.height;
    const savingsLink: FlowLink = {
      source: incomeNode.id,
      target: savingsNode.id,
      value: data.savings,
      path: buildPath(
        { x: incomeNode.x + incomeNode.width, y: savingsStartY },
        { x: savingsNode.x, y: savingsNode.y + savingsNode.height / 2 }
      ),
      center: {
        x: (incomeNode.x + incomeNode.width + savingsNode.x) / 2,
        y: (savingsStartY + savingsNode.y + savingsNode.height / 2) / 2,
      },
      color: savingsNode.color,
    };

    return { links: [...expenseLinks, savingsLink], nodes: allNodes, total };
  }, [data, marginX, marginY, viewBoxHeight, viewBoxWidth]);

  const projectToContainer = (point: FlowPoint) => {
    if (!containerRef.current) return point;
    const { width, height: boxHeight } = containerRef.current.getBoundingClientRect();
    return {
      x: (point.x / viewBoxWidth) * width,
      y: (point.y / viewBoxHeight) * boxHeight,
    };
  };

  return (
    <div className="w-full relative" style={{ height }} ref={containerRef}>
      <svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} className="w-full h-full">
        <defs>
          <linearGradient id="income-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(var(--color-app-primary))" stopOpacity="0.95" />
            <stop offset="100%" stopColor="rgb(var(--color-app-primary))" stopOpacity="0.75" />
          </linearGradient>
          <linearGradient id="expense-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fb7185" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="savings-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
          </linearGradient>
          <filter id="node-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="rgb(var(--color-app-bg))" floodOpacity="0.35" />
          </filter>
        </defs>

        <rect
          x={marginX / 2}
          y={marginY / 2}
          width={viewBoxWidth - marginX}
          height={viewBoxHeight - marginY}
          rx={16}
          fill="url(#income-gradient)"
          opacity="0.05"
        />

        {links.map((link) => (
          <path
            key={`${link.source}-${link.target}`}
            d={link.path}
            stroke={link.color}
            strokeWidth={Math.max(10, (link.value / total) * 48)}
            strokeOpacity="0.25"
            fill="none"
            className="transition-all duration-200"
            onMouseEnter={() => setTooltip({ label: `${link.source} → ${link.target}`, value: link.value, ...projectToContainer(link.center) })}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}

        {nodes.map((node) => (
          <g key={node.id}>
            <rect
              x={node.x}
              y={node.y}
              width={node.width}
              height={node.height}
              rx={8}
              fill={node.id === 'Income' ? 'url(#income-gradient)' : node.id === 'Savings' ? 'url(#savings-gradient)' : 'url(#expense-gradient)'}
              filter="url(#node-shadow)"
            />
            <text
              x={node.id === 'Income' ? node.x - 14 : node.id === 'Savings' ? node.x + node.width + 14 : node.x + node.width + 14}
              y={node.y - 8}
              textAnchor={node.id === 'Income' ? 'end' : 'start'}
              fill="rgb(var(--color-app-muted))"
              fontSize={14}
              fontWeight={500}
            >
              {node.id}
            </text>
            <text
              x={node.id === 'Income' ? node.x - 14 : node.id === 'Savings' ? node.x + node.width + 14 : node.x + node.width + 14}
              y={node.y + node.height + 16}
              textAnchor={node.id === 'Income' ? 'end' : 'start'}
              fill="rgb(var(--color-app-foreground))"
              fontSize={12}
            >
              {node.id === 'Income'
                ? `$${data.income.toLocaleString()}`
                : node.id === 'Savings'
                ? `$${data.savings.toLocaleString()}`
                : `$${data.expenses.find((exp) => exp.category === node.id)?.value.toLocaleString()}`}
            </text>
          </g>
        ))}
      </svg>

      {tooltip && (
        <div
          className="absolute bg-app-card border border-app-border rounded-lg px-3 py-2 shadow-lg text-sm"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -120%)',
          }}
        >
          <p className="text-app-foreground font-medium">{tooltip.label}</p>
          <p className="text-app-muted">${tooltip.value.toLocaleString()}</p>
        </div>
      )}
    </div>
  );
};
