import { TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, fullWidth, className, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className={cn('flex flex-col gap-1', fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={3}
          className={cn(
            'w-full rounded-lg border bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]',
            'border-[var(--border-default)] focus:border-brand-500 focus:outline-none',
            'px-3 py-2 text-sm transition-colors resize-y min-h-[80px]',
            error && 'border-danger',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        {hint && !error && <p className="text-xs text-[var(--text-tertiary)]">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
export default Textarea;
