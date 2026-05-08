import { cn } from '@/utils/cn';

interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

export default function RadioGroup({
  name,
  options,
  value,
  onChange,
  label,
  error,
  disabled,
  orientation = 'vertical',
  className,
}: RadioGroupProps) {
  return (
    <fieldset className={cn('space-y-2', className)}>
      {label && (
        <legend className="text-sm font-medium text-[var(--text-secondary)] mb-2">{label}</legend>
      )}
      <div className={cn('flex gap-3', orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap')}>
        {options.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              'flex items-start gap-3 cursor-pointer',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className="relative flex-shrink-0 mt-0.5">
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onChange?.(opt.value)}
                disabled={disabled}
                className={cn(
                  'peer w-4 h-4 appearance-none rounded-full border border-[var(--border-default)]',
                  'bg-[var(--bg-elevated)] cursor-pointer transition-all',
                  'checked:border-brand-500',
                  'hover:border-[var(--border-strong)]',
                  'focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2',
                  'disabled:cursor-not-allowed'
                )}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-2 h-2 rounded-full bg-brand-500 opacity-0 peer-checked:opacity-100 transition-opacity" />
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-sm text-[var(--text-primary)] leading-none">{opt.label}</span>
              {opt.description && <p className="text-xs text-[var(--text-tertiary)]">{opt.description}</p>}
            </div>
          </label>
        ))}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </fieldset>
  );
}
