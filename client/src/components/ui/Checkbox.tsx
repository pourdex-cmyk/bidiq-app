import { forwardRef } from 'react';
import { cn } from '@/utils/cn';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, className, ...props }, ref) => {
    return (
      <label className="flex items-start gap-3 cursor-pointer group">
        <div className="relative flex-shrink-0 mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            className={cn(
              'peer w-4 h-4 appearance-none rounded border border-[var(--border-default)]',
              'bg-[var(--bg-elevated)] cursor-pointer transition-all',
              'checked:bg-brand-500 checked:border-brand-500',
              'hover:border-[var(--border-strong)]',
              'focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-danger',
              className
            )}
            {...props}
          />
          <svg
            className="absolute inset-0 w-4 h-4 pointer-events-none opacity-0 peer-checked:opacity-100 text-white"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path d="M3.5 8l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {(label || description) && (
          <div className="space-y-0.5">
            {label && <span className="text-sm text-[var(--text-primary)] leading-none">{label}</span>}
            {description && <p className="text-xs text-[var(--text-tertiary)]">{description}</p>}
            {error && <p className="text-xs text-danger">{error}</p>}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
export default Checkbox;
