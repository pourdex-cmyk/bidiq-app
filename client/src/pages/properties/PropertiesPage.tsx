import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2, MapPin } from 'lucide-react';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import { SkeletonCard } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import YardiBadge from '@/components/ui/YardiBadge';
import { formatCurrency } from '@/utils/format';

const STATUS_COLORS: Record<string, any> = {
  active: 'success', under_renovation: 'warning', for_sale: 'info', sold: 'default', inactive: 'default'
};

export default function PropertiesPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/v1/properties', { params: { status: statusFilter || undefined, limit: 100 } })
      .then((r) => setProperties(r.data.data || []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <PageWrapper>
      <PageHeader
        title="Properties"
        subtitle={`${properties.length} properties`}
        actions={
          <div className="flex gap-2">
            <Select
              options={[
                { value: 'active', label: 'Active' },
                { value: 'under_renovation', label: 'Renovation' },
                { value: 'for_sale', label: 'For Sale' },
                { value: 'sold', label: 'Sold' },
              ]}
              placeholder="All status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-36"
            />
            <Button iconLeft={<Plus className="w-4 h-4" />} onClick={() => navigate('/properties/new')}>
              Add Property
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : properties.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-6 h-6" />}
          title="No properties yet"
          description="Add your first property to get started tracking renovations."
          action={{ label: 'Add Property', onClick: () => navigate('/properties/new') }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((p) => (
            <Card key={p.id} hover onClick={() => navigate(`/properties/${p.id}`)}>
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-brand-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{p.name}</p>
                      <p className="text-xs text-[var(--text-tertiary)] capitalize">{p.property_type?.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {p.yardi_property_id && <YardiBadge />}
                    <Badge variant={STATUS_COLORS[p.status] || 'default'} size="sm" dot>
                      {p.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                  <MapPin className="w-3 h-3" />
                  {p.address}, {p.city}, {p.state}
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]">
                  <div>
                    <p className="text-2xs text-[var(--text-tertiary)]">Current Value</p>
                    <p className="text-sm font-mono font-medium text-[var(--text-primary)]">{formatCurrency(p.current_value)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xs text-[var(--text-tertiary)]">Units</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{p.unit_count}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
