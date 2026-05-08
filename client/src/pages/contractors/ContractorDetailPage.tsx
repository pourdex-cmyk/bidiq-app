import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Phone, Mail } from 'lucide-react';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Table from '@/components/ui/Table';
import Skeleton from '@/components/ui/Skeleton';
import YardiBadge from '@/components/ui/YardiBadge';
import { formatCurrency, formatDate } from '@/utils/format';

export default function ContractorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contractor, setContractor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/v1/contractors/${id}`)
      .then((r) => setContractor(r.data.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageWrapper><Skeleton className="h-8 w-48" count={3} /></PageWrapper>;
  if (!contractor) return <PageWrapper><p className="text-[var(--text-secondary)]">Contractor not found</p></PageWrapper>;

  const totalPaid = contractor.contractor_invoices?.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + i.total_amount, 0) || 0;

  return (
    <PageWrapper>
      <PageHeader
        title={contractor.company_name}
        subtitle={contractor.contact_name}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" iconLeft={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/contractors')}>Back</Button>
            <Button variant="secondary">Edit</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: 'License', value: contractor.license_number || '—' },
              { label: 'License Expiry', value: formatDate(contractor.license_expiry) },
              { label: 'Insurance Expiry', value: formatDate(contractor.insurance_expiry) },
              { label: 'Rate', value: contractor.default_rate ? `$${contractor.default_rate}/${contractor.rate_type}` : '—' },
              { label: 'Total Paid', value: <span className="font-mono">{formatCurrency(totalPaid)}</span> },
              { label: 'Yardi ID', value: contractor.yardi_vendor_id ? <span className="flex items-center gap-1">{contractor.yardi_vendor_id} <YardiBadge /></span> : '—' },
            ].map((d) => (
              <div key={d.label}>
                <p className="text-xs text-[var(--text-tertiary)]">{d.label}</p>
                <p className="font-medium text-[var(--text-primary)]">{d.value}</p>
              </div>
            ))}
          </div>
          {contractor.specialties?.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {contractor.specialties.map((s: string) => <Badge key={s} size="sm" variant="brand" className="capitalize">{s.replace('_', ' ')}</Badge>)}
            </div>
          )}
        </Card>

        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Contact</h3>
          <div className="space-y-2 text-sm">
            {contractor.email && <div className="flex items-center gap-2 text-[var(--text-secondary)]"><Mail className="w-3.5 h-3.5" />{contractor.email}</div>}
            {contractor.phone && <div className="flex items-center gap-2 text-[var(--text-secondary)]"><Phone className="w-3.5 h-3.5" />{contractor.phone}</div>}
            {contractor.city && <p className="text-[var(--text-tertiary)]">{contractor.city}, {contractor.state}</p>}
            {contractor.rating && (
              <div className="flex items-center gap-1 pt-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < contractor.rating ? 'text-warning fill-warning' : 'text-[var(--text-disabled)]'}`} />
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent Invoices</h3>
        <Table
          columns={[
            { key: 'projects', header: 'Project', render: (r: any) => r.projects?.name || '—' },
            { key: 'invoice_date', header: 'Date', render: (r: any) => formatDate(r.invoice_date) },
            { key: 'total_amount', header: 'Amount', align: 'right', render: (r: any) => <span className="font-mono">{formatCurrency(r.total_amount)}</span> },
            { key: 'status', header: 'Status', render: (r: any) => <Badge size="sm" variant={r.status === 'paid' ? 'success' : 'warning'}>{r.status}</Badge> },
          ]}
          data={contractor.contractor_invoices?.slice(0, 10) || []}
          emptyText="No invoices"
        />
      </Card>

      {contractor.contractor_notes?.length > 0 && (
        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Notes</h3>
          {contractor.contractor_notes.map((note: any) => (
            <div key={note.id} className="p-3 rounded-lg bg-[var(--bg-elevated)] space-y-1">
              <div className="flex items-center gap-2">
                <Badge size="sm" className="capitalize">{note.note_type}</Badge>
                <span className="text-xs text-[var(--text-tertiary)]">{formatDate(note.created_at)}</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">{note.content}</p>
            </div>
          ))}
        </Card>
      )}
    </PageWrapper>
  );
}
