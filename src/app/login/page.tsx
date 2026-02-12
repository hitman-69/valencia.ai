'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      window.location.href = '/game/current';
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="card w-full max-w-sm text-center">
        <div className="mb-6">
          <span className="text-5xl">⚽</span>
          <h1 className="mt-3 font-display text-2xl font-bold">5x5 Soccer</h1>
          <p className="mt-1 text-sm text-gray-400">Sign in with your email and password</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" className="input text-center" placeholder="you@email.com"
            value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" className="input text-center" placeholder="Password"
            value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
