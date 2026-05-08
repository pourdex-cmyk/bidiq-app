import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });
  const [loading, setLoading] = useState(false);
  const { setSession, setOrgContext } = useAuthStore();
  const navigate = useNavigate();

  const onSubmit = async ({ email, password }: FormData) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setSession(data.session);
      // fetch org context
      const { data: userData } = await supabase.from('users').select('org_id, role').eq('id', data.user.id).single();
      if (userData) setOrgContext(userData.org_id, userData.role);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-heading font-bold text-[var(--text-primary)]">
            Bid<span className="text-brand-400">IQ</span>
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-card">
          <Input label="Email" type="email" placeholder="you@company.com" error={errors.email?.message} fullWidth {...register('email')} />
          <Input label="Password" type="password" placeholder="••••••••" error={errors.password?.message} fullWidth {...register('password')} />
          <Button type="submit" loading={loading} fullWidth>Sign In</Button>
          <div className="flex justify-between text-xs">
            <Link to="/magic-link" className="text-brand-400 hover:text-brand-300">Magic link</Link>
            <Link to="/register" className="text-brand-400 hover:text-brand-300">Create account</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
