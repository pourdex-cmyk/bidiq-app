import { useEffect, useState } from 'react';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import { formatCurrency, formatDate, formatPercent } from '@/utils/format';

const STATUS_COLORS: Record<string, any> = { pending: 'default', submitted: 'info', approved: 'brand', funded: 'success', denied: 'danger' };

export default function LoanDrawsPage() {
  const [draws, setDraws] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/v1/loan-draws', { params: { limit: 100 } })
      .then((r) => setDraws(r.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  const totalRequested = draws.reduce((s, d) => s + (d.requested_amount || 0), 0);
  const totalFunded = draws.reduce((s, d) => s + (d.funded_amount || 0), 0);

  return (
    <PageWrapper>
      <PageHeader title="Loan Draws" subtitle={`${draws.length} draws · ${formatCurrency(totalFunded)} funded of ${formatCurrency(totalRequested)} requested`} />
      <Table
        columns={[
          { key: 'projects', header: 'Project', render: (r: any) => r.projects?.name || '—' },
          { key: 'draw_number', header: '#', render: (r: any) => `Draw ${r.draw_number}` },
          { key: 'title', header: 'Title', render: (r: any) => r.title || '—' },
          { key: 'status', header: 'Status', render: (r: any) => <Badge size="sm" variant={STATUS_COLORS[r.status]}>{r.status}</Badge> },
          { key: 'requested_amount', header: 'Requested', align: 'right', render: (r: any) => <span className="font-mono">{formatCurrency(r.requested_amount)}</span> },
          { key: 'approved_amount', header: 'Approved', align: 'right', render: (r: any) => <span className="font-mono">{r.approved_amount ? formatCurrency(r.approved_amount) : '—'}</span> },
          { key: 'funded_amount', header: 'Funded', align: 'right', render: (r: any) => <span className="font-mono">{r.funded_amount ? formatCurrency(r.funded_amount) : '—'}</span> },
          { key: 'completion_percentage', header: '% Done', render: (r: any) => formatPercent(r.completion_percentage) },
          { key: 'submitted_date', header: 'Submitted', render: (r: any) => formatDate(r.submitted_date) },
        ]}
        data={draws}
        loading={loading}
        emptyText="No loan draws"
      />
    </PageWrapper>
  );
}
