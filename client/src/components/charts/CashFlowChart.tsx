import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend
} from 'recharts';
import { CHART_THEME } from './index';
import { formatCurrency } from '@/utils/format';

interface CashFlowEntry {
  period: string;
  inflows: number;
  outflows: number;
  net?: number;
}

interface CashFlowChartProps {
  data: CashFlowEntry[];
  height?: number;
}

export default function CashFlowChart({ data, height = 260 }: CashFlowChartProps) {
  const enriched = data.map((d) => ({ ...d, net: (d.inflows || 0) - (d.outflows || 0) }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={enriched} barGap={2} barCategoryGap="25%">
        <CartesianGrid {...CHART_THEME.grid} vertical={false} />
        <XAxis dataKey="period" {...CHART_THEME.axis} />
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
        <Bar dataKey="inflows" name="Inflows" fill={CHART_THEME.colors.success} opacity={0.8} radius={[4, 4, 0, 0]} />
        <Bar dataKey="outflows" name="Outflows" fill={CHART_THEME.colors.danger} opacity={0.7} radius={[4, 4, 0, 0]} />
        <Line type="monotone" dataKey="net" name="Net" stroke={CHART_THEME.colors.brand} strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
