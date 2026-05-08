import { forwardRef } from 'react';
import { cn } from '@/utils/cn';
import { Calendar } from 'lucide-react';

interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
}

const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ label, error, hint, fullWidth, className, ...props }, ref) => {
    return (
      <div className={cn('flex flex-col gap-1', fullWidth && 'w-full')}>
        {label && (
          <label className="text-sm font-medium text-[var(--text-secondary)]">{label}</label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type="date"
            className={cn(
              'h-9 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)]',
              'px-3 text-sm text-[var(--text-primary)] transition-all',
              'placeholder:text-[var(--text-disabled)]',
              'hover:border-[var(--border-strong)]',
              'focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              '[color-scheme:dark]',
              error && 'border-danger focus:border-danger focus:ring-danger/20',
              fullWidth ? 'w-full' : 'w-auto',
              className
            )}
            {...props}
          />
        </div>
        {hint && !error && <p className="text-xs text-[var(--text-tertiary)]">{hint}</p>}
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';
export default DatePicker;
