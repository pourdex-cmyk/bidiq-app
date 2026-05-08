import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/services/supabase';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function MagicLinkPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-heading font-bold text-[var(--text-primary)]">Bid<span className="text-brand-400">IQ</span></h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Sign in with magic link</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-card">
          {sent ? (
            <div className="text-center space-y-3 py-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-success-bg flex items-center justify-center">
                <Mail className="w-6 h-6 text-success" />
              </div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Check your email</p>
              <p className="text-xs text-[var(--text-secondary)]">We sent a magic link to {email}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" fullWidth />
              <Button type="submit" loading={loading} fullWidth>Send Magic Link</Button>
            </form>
          )}
        </div>
        <p className="text-center text-xs text-[var(--text-tertiary)]">
          <Link to="/login" className="text-brand-400">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
