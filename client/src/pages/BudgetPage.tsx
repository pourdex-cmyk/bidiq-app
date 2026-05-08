import { useEffect, useState } from 'react';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Select from '@/components/ui/Select';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import { formatCurrency } from '@/utils/format';

export default function BudgetPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/v1/projects', { params: { limit: 100 } }).then((r) => setProjects(r.data.data || []));
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    setLoading(true);
    api.get('/v1/line-items', { params: { projectId: selectedProject, limit: 200 } })
      .then((r) => setLineItems(r.data.data || []))
      .finally(() => setLoading(false));
  }, [selectedProject]);

  const totalBudget = lineItems.reduce((s, i) => s + (i.budgeted_amount || 0), 0);
  const totalActual = lineItems.reduce((s, i) => s + (i.actual_amount || 0), 0);

  return (
    <PageWrapper>
      <PageHeader title="Budget Tracking" subtitle="Line items and spend by project" />
      <Select
        label="Select Project"
        options={projects.map((p) => ({ value: p.id, label: p.name }))}
        placeholder="Choose a project"
        value={selectedProject}
        onChange={(e) => setSelectedProject(e.target.value)}
        className="max-w-sm"
      />
      {selectedProject && (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Budget', value: formatCurrency(totalBudget) },
              { label: 'Total Spent', value: formatCurrency(totalActual) },
              { label: 'Remaining', value: formatCurrency(totalBudget - totalActual) },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 space-y-1">
                <p className="text-xs text-[var(--text-tertiary)]">{s.label}</p>
                <p className="text-xl font-mono font-semibold text-[var(--text-primary)]">{s.value}</p>
              </div>
            ))}
          </div>
          {totalBudget > 0 && <ProgressBar value={(totalActual / totalBudget) * 100} showLabel size="md" />}
          <Table
            columns={[
              { key: 'category', header: 'Category', render: (r: any) => <span className="capitalize">{r.category?.replace('_', ' ')}</span> },
              { key: 'description', header: 'Description' },
              { key: 'contractors', header: 'Contractor', render: (r: any) => r.contractors?.company_name || '—' },
              { key: 'status', header: 'Status', render: (r: any) => <Badge size="sm" variant={r.status === 'completed' ? 'success' : r.status === 'in_progress' ? 'info' : 'default'}>{r.status}</Badge> },
              { key: 'budgeted_amount', header: 'Budget', align: 'right', render: (r: any) => <span className="font-mono">{formatCurrency(r.budgeted_amount)}</span> },
              { key: 'committed_amount', header: 'Committed', align: 'right', render: (r: any) => <span className="font-mono">{formatCurrency(r.committed_amount)}</span> },
              { key: 'actual_amount', header: 'Actual', align: 'right', render: (r: any) => <span className="font-mono">{formatCurrency(r.actual_amount)}</span> },
            ]}
            data={lineItems}
            loading={loading}
            emptyText="No line items — select a project above"
          />
        </>
      )}
    </PageWrapper>
  );
}
