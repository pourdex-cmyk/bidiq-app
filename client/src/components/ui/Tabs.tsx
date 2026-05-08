import { cn } from '@/utils/cn';

interface Tab {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export default function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex border-b border-[var(--border-subtle)] gap-0', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px',
            active === tab.id
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-2xs font-semibold min-w-[1.25rem] text-center',
              active === tab.id ? 'bg-brand-500/20 text-brand-300' : 'bg-[var(--bg-overlay)] text-[var(--text-tertiary)]'
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
