import { cn } from '@/utils/cn';

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <div className={cn('p-6 space-y-6 max-w-screen-2xl mx-auto', className)}>
      {children}
    </div>
  );
}
