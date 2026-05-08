import { cn } from '@/utils/cn';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export default function Skeleton({ className, count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn('skeleton rounded-md bg-[var(--bg-elevated)]', className)} />
      ))}
    </>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}
