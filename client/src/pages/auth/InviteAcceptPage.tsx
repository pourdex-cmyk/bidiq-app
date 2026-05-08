import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import api from '@/services/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const schema = z.object({ fullName: z.string().min(2), password: z.string().min(8) });
type FormData = z.infer<typeof schema>;

export default function InviteAcceptPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async ({ fullName, password }: FormData) => {
    setLoading(true);
    try {
      await api.post('/v1/auth/invite-accept', { token, fullName, password });
      toast.success('Account activated! Please sign in.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to activate account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-heading font-bold text-[var(--text-primary)]">Bid<span className="text-brand-400">IQ</span></h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Accept your invitation</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-card">
          <Input label="Your Name" error={errors.fullName?.message} fullWidth {...register('fullName')} />
          <Input label="Create Password" type="password" placeholder="••••••••" error={errors.password?.message} fullWidth {...register('password')} />
          <Button type="submit" loading={loading} fullWidth>Activate Account</Button>
        </form>
      </div>
    </div>
  );
}
