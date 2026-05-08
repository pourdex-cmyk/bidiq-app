interface BenchmarkEntry {
  category: string;
  p25: number;
  avg: number;
  p75: number;
  value?: number;
}

interface BenchmarkRangeChartProps {
  data: BenchmarkEntry[];
  height?: number;
}

const BAR_HEIGHT = 32;
const LABEL_WIDTH = 120;
const PADDING = 8;

export default function BenchmarkRangeChart({ data, height }: BenchmarkRangeChartProps) {
  if (!data.length) return null;

  const maxVal = Math.max(...data.map((d) => d.p75));
  const chartWidth = 400;
  const svgHeight = height ?? data.length * (BAR_HEIGHT + PADDING) + 20;

  return (
    <div className="w-full overflow-x-auto">
      <svg width="100%" height={svgHeight} viewBox={`0 0 ${LABEL_WIDTH + chartWidth + 60} ${svgHeight}`}>
        {data.map((d, i) => {
          const y = i * (BAR_HEIGHT + PADDING) + 10;
          const scale = (v: number) => LABEL_WIDTH + (v / maxVal) * chartWidth;
          const p25x = scale(d.p25);
          const p75x = scale(d.p75);
          const avgx = scale(d.avg);
          const valuex = d.value != null ? scale(d.value) : null;

          return (
            <g key={d.category}>
              <text
                x={LABEL_WIDTH - 8}
                y={y + BAR_HEIGHT / 2 + 4}
                textAnchor="end"
                fontSize={11}
                fill="var(--text-tertiary)"
                className="capitalize"
              >
                {d.category.replace('_', ' ')}
              </text>

              <rect
                x={p25x}
                y={y + BAR_HEIGHT / 4}
                width={p75x - p25x}
                height={BAR_HEIGHT / 2}
                rx={4}
                fill="var(--brand-500)"
                opacity={0.2}
              />

              <line
                x1={avgx}
                y1={y + 4}
                x2={avgx}
                y2={y + BAR_HEIGHT - 4}
                stroke="var(--brand-500)"
                strokeWidth={2}
                strokeLinecap="round"
              />

              <text
                x={avgx}
                y={y + BAR_HEIGHT + 4}
                textAnchor="middle"
                fontSize={9}
                fill="var(--text-tertiary)"
              >
                avg ${d.avg}
              </text>

              {valuex != null && (
                <circle
                  cx={valuex}
                  cy={y + BAR_HEIGHT / 2}
                  r={5}
                  fill="var(--color-warning)"
                  stroke="var(--bg-surface)"
                  strokeWidth={2}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
