import { cn } from '@/utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

const paddings = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-6' };

export default function Card({ children, className, padding = 'md', hover, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-card',
        paddings[padding],
        hover && 'hover:border-[var(--border-strong)] hover:shadow-elevated transition-all cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ label, value, change, changeLabel, icon, className }: StatCardProps) {
  return (
    <Card className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--text-secondary)]">{label}</span>
        {icon && <span className="text-[var(--text-tertiary)]">{icon}</span>}
      </div>
      <div className="text-2xl font-heading font-semibold text-[var(--text-primary)] font-financial">
        {value}
      </div>
      {(change !== undefined || changeLabel) && (
        <div className={cn('text-xs flex items-center gap-1', change !== undefined && change >= 0 ? 'text-success' : 'text-danger')}>
          {change !== undefined && <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>}
          {changeLabel && <span className="text-[var(--text-tertiary)]">{changeLabel}</span>}
        </div>
      )}
    </Card>
  );
}
