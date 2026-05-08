import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Skeleton from '@/components/ui/Skeleton';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zip: z.string().optional(),
  propertyType: z.enum(['single_family', 'multi_family', 'mixed_use', 'commercial', 'land']),
  status: z.enum(['active', 'under_renovation', 'for_sale', 'sold', 'inactive']),
  unitCount: z.coerce.number().int().min(1),
  purchasePrice: z.coerce.number().optional(),
  currentValue: z.coerce.number().optional(),
});

type FormData = z.infer<typeof schema>;

export default function EditPropertyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    api.get(`/v1/properties/${id}`).then((r) => {
      const p = r.data.data;
      reset({
        name: p.name,
        address: p.address,
        city: p.city,
        state: p.state,
        zip: p.zip,
        propertyType: p.property_type,
        status: p.status,
        unitCount: p.unit_count,
        purchasePrice: p.purchase_price,
        currentValue: p.current_value,
      });
    }).finally(() => setLoading(false));
  }, [id, reset]);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      await api.patch(`/v1/properties/${id}`, data);
      toast.success('Property updated');
      navigate(`/properties/${id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageWrapper><Skeleton className="h-8 w-48" count={5} /></PageWrapper>;

  return (
    <PageWrapper>
      <PageHeader
        title="Edit Property"
        actions={
          <Button variant="ghost" onClick={() => navigate(`/properties/${id}`)}>Cancel</Button>
        }
      />
      <Card className="max-w-2xl space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Property Name" fullWidth error={errors.name?.message} {...register('name')} />
            <Select
              label="Property Type"
              options={[
                { value: 'single_family', label: 'Single Family' },
                { value: 'multi_family', label: 'Multi Family' },
                { value: 'mixed_use', label: 'Mixed Use' },
                { value: 'commercial', label: 'Commercial' },
                { value: 'land', label: 'Land' },
              ]}
              fullWidth
              {...register('propertyType')}
            />
          </div>
          <Input label="Street Address" fullWidth error={errors.address?.message} {...register('address')} />
          <div className="grid grid-cols-3 gap-4">
            <Input label="City" fullWidth error={errors.city?.message} {...register('city')} />
            <Input label="State" fullWidth error={errors.state?.message} {...register('state')} />
            <Input label="ZIP" fullWidth {...register('zip')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'under_renovation', label: 'Under Renovation' },
                { value: 'for_sale', label: 'For Sale' },
                { value: 'sold', label: 'Sold' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              fullWidth
              {...register('status')}
            />
            <Input label="Unit Count" type="number" fullWidth error={errors.unitCount?.message} {...register('unitCount')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Purchase Price ($)" type="number" fullWidth {...register('purchasePrice')} />
            <Input label="Current Value ($)" type="number" fullWidth {...register('currentValue')} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={saving}>Save Changes</Button>
            <Button type="button" variant="ghost" onClick={() => navigate(`/properties/${id}`)}>Cancel</Button>
          </div>
        </form>
      </Card>
    </PageWrapper>
  );
}
