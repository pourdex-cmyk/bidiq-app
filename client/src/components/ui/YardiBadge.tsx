import { cn } from '@/utils/cn';

interface YardiBadgeProps {
  synced?: boolean;
  className?: string;
}

export default function YardiBadge({ synced = true, className }: YardiBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-medium',
      synced
        ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
        : 'bg-[var(--bg-overlay)] text-[var(--text-tertiary)] border border-[var(--border-subtle)]',
      className
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', synced ? 'bg-brand-400' : 'bg-[var(--text-tertiary)]')} />
      Yardi
    </span>
  );
}
