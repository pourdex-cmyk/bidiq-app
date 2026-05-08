import { cn } from '@/utils/cn';

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export default function Toggle({ checked, onChange, label, disabled, size = 'md' }: ToggleProps) {
  const trackSize = size === 'sm' ? 'w-8 h-4' : 'w-10 h-5';
  const thumbSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const thumbTranslate = size === 'sm' ? 'translate-x-4' : 'translate-x-5';

  return (
    <label className={cn('inline-flex items-center gap-2', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex items-center rounded-full transition-colors',
          trackSize,
          checked ? 'bg-brand-500' : 'bg-[var(--bg-overlay)]'
        )}
      >
        <span className={cn(
          'absolute left-0.5 inline-block rounded-full bg-white shadow transition-transform',
          thumbSize,
          checked ? thumbTranslate : 'translate-x-0.5'
        )} />
      </button>
      {label && <span className="text-sm text-[var(--text-secondary)]">{label}</span>}
    </label>
  );
}
