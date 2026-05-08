import { cn } from '@/utils/cn';
import Button from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center gap-4', className)}>
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-tertiary)]">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
        {description && <p className="text-sm text-[var(--text-secondary)] max-w-sm">{description}</p>}
      </div>
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  );
}
