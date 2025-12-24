export const chartTickStyle = {
  fill: 'rgb(var(--color-app-muted))',
  fontSize: 12,
};

export const chartGridColor = 'rgb(var(--color-app-border))';

export const chartTooltipStyle = {
  backgroundColor: 'rgb(var(--color-app-card))',
  borderColor: 'rgb(var(--color-app-border))',
  borderRadius: '10px',
  color: 'rgb(var(--color-app-foreground))',
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
};

export const chartLabelStyle = {
  fill: 'rgb(var(--color-app-foreground))',
  fontWeight: 600,
};

export const formatCurrency = (value: number | string) =>
  `$${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
