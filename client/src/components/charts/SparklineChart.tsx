import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { CHART_THEME } from './index';

interface SparklineChartProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number | string;
  showTooltip?: boolean;
}

export default function SparklineChart({
  data,
  color = CHART_THEME.colors.brand,
  height = 40,
  width = '100%',
  showTooltip = false,
}: SparklineChartProps) {
  const chartData = data.map((value, index) => ({ index, value }));

  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        {showTooltip && (
          <Tooltip
            {...CHART_THEME.tooltip}
            formatter={(v: number) => [v, '']}
            labelFormatter={() => ''}
          />
        )}
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          activeDot={showTooltip ? { r: 3, fill: color } : false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
