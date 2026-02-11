'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (authError) setError(authError.message);
    else setSent(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="card w-full max-w-sm text-center">
        <div className="mb-6">
          <span className="text-5xl">⚽</span>
          <h1 className="mt-3 font-display text-2xl font-bold">5x5 Soccer</h1>
          <p className="mt-1 text-sm text-gray-400">Sign in with your email</p>
        </div>
        {sent ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-600/10 p-4 text-sm text-emerald-300">
            Check your email for the magic link!
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" className="input text-center" placeholder="you@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
