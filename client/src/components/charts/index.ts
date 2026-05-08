export const CHART_THEME = {
  colors: {
    brand: '#6366f1',
    success: '#22c55e',
    warning: '#f59e0b',
    info: '#3b82f6',
    pink: '#ec4899',
    teal: '#14b8a6',
    orange: '#f97316',
    danger: '#ef4444',
  },
  palette: ['#6366f1', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#f97316'],
  axis: {
    tick: { fontSize: 11, fill: 'var(--text-tertiary)' },
    axisLine: false as const,
    tickLine: false as const,
  },
  tooltip: {
    contentStyle: {
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 8,
      fontSize: 12,
      color: 'var(--text-primary)',
    },
  },
  grid: {
    stroke: 'var(--border-subtle)',
    strokeDasharray: '3 3',
  },
};

export { default as PortfolioBudgetChart } from './PortfolioBudgetChart';
export { default as ProjectBudgetGauge } from './ProjectBudgetGauge';
export { default as SparklineChart } from './SparklineChart';
export { default as CashFlowChart } from './CashFlowChart';
export { default as ContractorSpendDonut } from './ContractorSpendDonut';
export { default as BenchmarkRangeChart } from './BenchmarkRangeChart';
