import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Star } from 'lucide-react';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import YardiBadge from '@/components/ui/YardiBadge';
import { Search } from 'lucide-react';

export default function ContractorsPage() {
  const [contractors, setContractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => {
      api.get('/v1/contractors', { params: { search: search || undefined, limit: 100 } })
        .then((r) => setContractors(r.data.data || []))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <PageWrapper>
      <PageHeader
        title="Contractors"
        subtitle={`${contractors.length} contractors`}
        actions={
          <div className="flex gap-2">
            <Input placeholder="Search…" iconLeft={<Search className="w-3.5 h-3.5" />} value={search}
              onChange={(e) => setSearch(e.target.value)} className="w-48" />
            <Button iconLeft={<Plus className="w-4 h-4" />} onClick={() => navigate('/contractors/new')}>Add Contractor</Button>
          </div>
        }
      />
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : contractors.length === 0 ? (
        <EmptyState icon={<Users className="w-6 h-6" />} title="No contractors" description="Add contractors to assign them to projects and track invoices." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contractors.map((c) => (
            <Card key={c.id} hover onClick={() => navigate(`/contractors/${c.id}`)}>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{c.company_name}</p>
                      {c.is_preferred && <Star className="w-3.5 h-3.5 text-warning fill-warning" />}
                    </div>
                    {c.contact_name && <p className="text-xs text-[var(--text-tertiary)]">{c.contact_name}</p>}
                  </div>
                  {c.yardi_vendor_id && <YardiBadge />}
                </div>
                {c.specialties?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {c.specialties.slice(0, 3).map((s: string) => (
                      <Badge key={s} size="sm" className="capitalize">{s.replace('_', ' ')}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] pt-1 border-t border-[var(--border-subtle)]">
                  <span>{c.email || '—'}</span>
                  {c.rating && (
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < c.rating ? 'text-warning fill-warning' : 'text-[var(--text-disabled)]'}`} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
