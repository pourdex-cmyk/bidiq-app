import { format, formatDistanceToNow } from 'date-fns';

export function formatCurrency(value: number | null | undefined, compact = false): string {
  if (value == null) return '—';
  if (compact && Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (compact && Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null) return '—';
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(date: string | Date | null | undefined, pattern = 'MMM d, yyyy'): string {
  if (!date) return '—';
  return format(new Date(date), pattern);
}

export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatMultiple(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${value.toFixed(2)}x`;
}
