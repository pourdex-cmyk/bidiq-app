import { useEffect, useState } from 'react';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import { formatRelative } from '@/utils/format';

const ACTION_COLORS: Record<string, any> = { create: 'success', update: 'info', delete: 'danger', approve: 'brand', deny: 'danger', import: 'warning', export: 'default', login: 'default', logout: 'default' };

export default function AuditPage() {
  const [log, setLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/v1/audit', { params: { limit: 100 } })
      .then((r) => setLog(r.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageWrapper>
      <PageHeader title="Audit Log" subtitle="All changes made in your organization" />
      <Table
        columns={[
          { key: 'users', header: 'User', render: (r: any) => r.users?.full_name || r.users?.email || '—' },
          { key: 'action', header: 'Action', render: (r: any) => <Badge size="sm" variant={ACTION_COLORS[r.action]}>{r.action}</Badge> },
          { key: 'table_name', header: 'Table', render: (r: any) => <span className="font-mono text-xs">{r.table_name}</span> },
          { key: 'record_id', header: 'Record', render: (r: any) => r.record_id ? <span className="font-mono text-xs text-[var(--text-tertiary)]">{r.record_id.slice(0, 8)}…</span> : '—' },
          { key: 'ip_address', header: 'IP', render: (r: any) => <span className="font-mono text-xs text-[var(--text-tertiary)]">{r.ip_address || '—'}</span> },
          { key: 'created_at', header: 'When', render: (r: any) => formatRelative(r.created_at) },
        ]}
        data={log}
        loading={loading}
        emptyText="No audit records"
      />
    </PageWrapper>
  );
}
