import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const schema = z.object({
  fullName: z.string().min(2, 'Required'),
  orgName: z.string().min(2, 'Required'),
  orgSlug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });
  const [loading, setLoading] = useState(false);
  const { setSession, setOrgContext } = useAuthStore();
  const navigate = useNavigate();

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await api.post('/v1/auth/register', data);
      const { session, org } = res.data.data;
      const { data: authData } = await supabase.auth.setSession(session);
      if (authData.session) {
        setSession(authData.session);
        setOrgContext(org.id, 'admin');
      }
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-heading font-bold text-[var(--text-primary)]">Bid<span className="text-brand-400">IQ</span></h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Create your organization</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-card">
          <Input label="Your Name" placeholder="Chris Callahan" error={errors.fullName?.message} fullWidth {...register('fullName')} />
          <Input label="Company Name" placeholder="Beantown Companies" error={errors.orgName?.message} fullWidth {...register('orgName')} />
          <Input label="URL Slug" placeholder="beantown" hint="Letters, numbers, hyphens" error={errors.orgSlug?.message} fullWidth {...register('orgSlug')} />
          <Input label="Email" type="email" placeholder="you@company.com" error={errors.email?.message} fullWidth {...register('email')} />
          <Input label="Password" type="password" placeholder="••••••••" error={errors.password?.message} fullWidth {...register('password')} />
          <Button type="submit" loading={loading} fullWidth>Create Account</Button>
          <p className="text-center text-xs text-[var(--text-tertiary)]">
            Already have an account? <Link to="/login" className="text-brand-400">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
