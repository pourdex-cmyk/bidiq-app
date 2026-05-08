import { forwardRef, useCallback } from 'react';
import Input from './Input';

interface CurrencyInputProps {
  label?: string;
  error?: string;
  hint?: string;
  value?: number | string;
  onChange?: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  fullWidth?: boolean;
}

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9.]/g, '');
      const num = parseFloat(raw);
      onChange?.(isNaN(num) ? 0 : num);
    }, [onChange]);

    const displayValue = value !== undefined && value !== '' && value !== 0
      ? String(value)
      : '';

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        iconLeft={<span className="text-xs font-mono">$</span>}
        value={displayValue}
        onChange={handleChange}
        className="font-mono"
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
export default CurrencyInput;
