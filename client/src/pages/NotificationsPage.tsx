import { Bell, CheckCheck } from 'lucide-react';
import Button from '@/components/ui/Button';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useNotifications } from '@/hooks/useNotifications';
import { formatRelative } from '@/utils/format';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

const TYPE_VARIANTS: Record<string, any> = {
  budget_overrun: 'danger', permit_expiring: 'warning', invoice_due: 'warning',
  draw_approved: 'success', draw_denied: 'danger', yardi_sync_complete: 'brand',
  yardi_conflict: 'warning', project_milestone: 'info', system: 'default',
};

export default function NotificationsPage() {
  const { notifications, markRead } = useNotifications();
  const unread = notifications.filter((n) => !n.is_read);

  return (
    <PageWrapper>
      <PageHeader title="Notifications" subtitle={`${unread.length} unread`}
        actions={unread.length > 0 && (
          <Button variant="secondary" size="sm" iconLeft={<CheckCheck className="w-3.5 h-3.5" />} onClick={() => markRead(unread.map((n) => n.id))}>
            Mark all read
          </Button>
        )} />

      <Card padding="none" className="divide-y divide-[var(--border-subtle)]">
        {notifications.length === 0 && (
          <div className="py-16 text-center space-y-2">
            <Bell className="w-8 h-8 text-[var(--text-tertiary)] mx-auto" />
            <p className="text-sm text-[var(--text-secondary)]">All caught up</p>
          </div>
        )}
        {notifications.map((n) => (
          <Link
            key={n.id}
            to={n.link || '#'}
            onClick={() => { if (!n.is_read) markRead([n.id]); }}
            className={cn('flex gap-4 px-4 py-3 hover:bg-[var(--bg-elevated)] transition-colors', !n.is_read && 'bg-brand-500/5')}
          >
            {!n.is_read && <span className="mt-2 w-2 h-2 rounded-full bg-brand-400 flex-shrink-0" />}
            <div className={cn('flex-1 space-y-1', n.is_read && 'ml-6')}>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-[var(--text-primary)]">{n.title}</p>
                <Badge size="sm" variant={TYPE_VARIANTS[n.type] || 'default'}>{n.type?.replace('_', ' ')}</Badge>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">{n.message}</p>
              <p className="text-xs text-[var(--text-tertiary)]">{formatRelative(n.created_at)}</p>
            </div>
          </Link>
        ))}
      </Card>
    </PageWrapper>
  );
}
