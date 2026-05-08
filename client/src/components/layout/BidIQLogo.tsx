import { cn } from '@/utils/cn';

interface BidIQLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-3xl',
};

export default function BidIQLogo({ size = 'md', className }: BidIQLogoProps) {
  return (
    <span className={cn('font-heading font-bold text-[var(--text-primary)] select-none', sizes[size], className)}>
      Bid<span className="text-brand-400">IQ</span>
    </span>
  );
}
