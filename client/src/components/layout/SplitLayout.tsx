import { cn } from '@/utils/cn';
import BidIQLogo from './BidIQLogo';

interface SplitLayoutProps {
  children: React.ReactNode;
  panel?: React.ReactNode;
  panelClassName?: string;
}

const DEFAULT_PANEL = (
  <div className="flex flex-col justify-between h-full p-10">
    <BidIQLogo size="lg" />
    <div className="space-y-4">
      <h2 className="text-3xl font-heading font-bold text-white leading-tight">
        Real estate renovation intelligence for serious operators.
      </h2>
      <p className="text-[rgba(255,255,255,0.65)] text-base leading-relaxed">
        Track budgets, manage contractors, model equity, and stay ahead of every permit deadline — from one platform.
      </p>
      <div className="flex gap-6 pt-4">
        {[
          { value: '20+', label: 'Tables & relationships' },
          { value: '100%', label: 'Yardi compatible' },
          { value: 'Real-time', label: 'Budget alerts' },
        ].map((s) => (
          <div key={s.label}>
            <p className="text-2xl font-heading font-bold text-white">{s.value}</p>
            <p className="text-xs text-[rgba(255,255,255,0.5)]">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
    <p className="text-xs text-[rgba(255,255,255,0.3)]">© {new Date().getFullYear()} BidIQ · Beantown Companies</p>
  </div>
);

export default function SplitLayout({ children, panel, panelClassName }: SplitLayoutProps) {
  return (
    <div className="min-h-screen flex bg-[var(--bg-base)]">
      <div className={cn(
        'hidden lg:flex lg:w-[420px] xl:w-[480px] flex-shrink-0',
        'bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500',
        panelClassName
      )}>
        {panel ?? DEFAULT_PANEL}
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden text-center">
            <BidIQLogo size="md" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
