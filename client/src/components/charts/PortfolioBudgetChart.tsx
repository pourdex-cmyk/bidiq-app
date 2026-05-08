import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from 'recharts';
import { CHART_THEME } from './index';
import { formatCurrency } from '@/utils/format';

interface ProjectBudgetData {
  name: string;
  budget: number;
  spend: number;
}

interface PortfolioBudgetChartProps {
  data: ProjectBudgetData[];
  height?: number;
}

export default function PortfolioBudgetChart({ data, height = 240 }: PortfolioBudgetChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} barGap={4} barCategoryGap="30%">
        <CartesianGrid {...CHART_THEME.grid} vertical={false} />
        <XAxis dataKey="name" {...CHART_THEME.axis} />
        <YAxis
          tickFormatter={(v) => formatCurrency(v, true)}
          {...CHART_THEME.axis}
          width={64}
        />
        <Tooltip
          {...CHART_THEME.tooltip}
          formatter={(v: number, name: string) => [formatCurrency(v), name]}
        />
        <Legend iconSize={8} iconType="circle" formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{v}</span>} />
        <Bar dataKey="budget" name="Budget" fill={CHART_THEME.colors.brand} opacity={0.35} radius={[4, 4, 0, 0]} />
        <Bar dataKey="spend" name="Spent" fill={CHART_THEME.colors.brand} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
