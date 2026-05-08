import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CHART_THEME } from './index';
import { formatCurrency } from '@/utils/format';

interface ContractorSpend {
  name: string;
  amount: number;
}

interface ContractorSpendDonutProps {
  data: ContractorSpend[];
  height?: number;
}

export default function ContractorSpendDonut({ data, height = 220 }: ContractorSpendDonutProps) {
  const total = data.reduce((s, d) => s + d.amount, 0);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          dataKey="amount"
          paddingAngle={3}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_THEME.palette[i % CHART_THEME.palette.length]} />
          ))}
        </Pie>
        <Tooltip
          {...CHART_THEME.tooltip}
          formatter={(v: number, name: string) => [formatCurrency(v), name]}
        />
        <Legend
          iconSize={8}
          iconType="circle"
          formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
