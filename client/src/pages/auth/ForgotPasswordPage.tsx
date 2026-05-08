import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/services/supabase';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SplitLayout from '@/components/layout/SplitLayout';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors }, getValues } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ email }: FormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SplitLayout>
      {sent ? (
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-success-bg flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-success" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-heading font-bold text-[var(--text-primary)]">Check your inbox</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              We sent a password reset link to <strong className="text-[var(--text-primary)]">{getValues('email')}</strong>
            </p>
          </div>
          <Link to="/login">
            <Button variant="secondary" fullWidth iconLeft={<ArrowLeft className="w-4 h-4" />}>
              Back to sign in
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-heading font-bold text-[var(--text-primary)]">Reset password</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Enter your email and we'll send a reset link.
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-card"
          >
            <Input
              label="Email address"
              type="email"
              placeholder="you@company.com"
              iconLeft={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              fullWidth
              {...register('email')}
            />
            <Button type="submit" loading={loading} fullWidth>
              Send reset link
            </Button>
          </form>

          <div className="text-center">
            <Link to="/login" className="text-sm text-brand-400 hover:text-brand-300 inline-flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
            </Link>
          </div>
        </div>
      )}
    </SplitLayout>
  );
}
