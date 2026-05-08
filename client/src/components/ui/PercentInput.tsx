import { forwardRef, useState } from 'react';
import { cn } from '@/utils/cn';

interface PercentInputProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  error?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
}

export default function PercentInput({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 0.1,
  error,
  hint,
  disabled,
  className,
  fullWidth,
}: PercentInputProps) {
  const [focused, setFocused] = useState(false);

  const displayValue = focused ? (value === 0 ? '' : String(value)) : value === 0 ? '0' : String(value);

  return (
    <div className={cn('flex flex-col gap-1', fullWidth && 'w-full')}>
      {label && (
        <label className="text-sm font-medium text-[var(--text-secondary)]">{label}</label>
      )}
      <div className="relative">
        <input
          type="number"
          value={displayValue}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false);
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
          }}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
          }}
          className={cn(
            'h-9 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)]',
            'pl-3 pr-8 text-sm font-mono text-[var(--text-primary)] transition-all',
            'hover:border-[var(--border-strong)]',
            'focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
            error && 'border-danger focus:border-danger focus:ring-danger/20',
            className
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-tertiary)] pointer-events-none">%</span>
      </div>
      {hint && !error && <p className="text-xs text-[var(--text-tertiary)]">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
