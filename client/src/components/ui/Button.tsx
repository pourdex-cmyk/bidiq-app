import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';
import Spinner from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 hover:bg-brand-500 text-white border-transparent shadow-sm',
  secondary: 'bg-transparent hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-default)]',
  ghost: 'bg-transparent hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-transparent',
  danger: 'bg-danger hover:opacity-90 text-white border-transparent shadow-sm',
  success: 'bg-success hover:opacity-90 text-white border-transparent shadow-sm',
};

const sizes: Record<Size, string> = {
  xs: 'h-6 px-2 text-xs gap-1',
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-6 text-base gap-2',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, iconLeft, iconRight, fullWidth, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg border font-medium transition-all duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  )
);

Button.displayName = 'Button';
export default Button;
