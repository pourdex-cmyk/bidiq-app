interface ProjectBudgetGaugeProps {
  pct: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

function getGaugeColor(pct: number): string {
  if (pct <= 90) return 'var(--color-success)';
  if (pct <= 100) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

export default function ProjectBudgetGauge({ pct, size = 120, strokeWidth = 10, label }: ProjectBudgetGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(150, Math.max(0, pct));
  const offset = circumference - (clampedPct / 150) * circumference;
  const color = getGaugeColor(pct);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="var(--bg-elevated)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
        />
      </svg>
      <div className="text-center -mt-2">
        <p className="text-lg font-mono font-semibold text-[var(--text-primary)]" style={{ color }}>
          {pct.toFixed(1)}%
        </p>
        {label && <p className="text-xs text-[var(--text-tertiary)]">{label}</p>}
      </div>
    </div>
  );
}
