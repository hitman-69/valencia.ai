import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';

export async function Nav() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    isAdmin = profile?.role === 'admin';
  }
  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/game/current" className="flex items-center gap-2.5 group">
          <span className="text-2xl">⚽</span>
          <span className="font-display text-lg font-bold text-gray-100 group-hover:text-emerald-400 transition">5x5</span>
        </Link>
        {user && (
          <div className="flex items-center gap-1">
            <Link href="/game/current" className="btn-ghost text-sm">Game</Link>
            <Link href="/games" className="btn-ghost text-sm">History</Link>
            <Link href="/vote" className="btn-ghost text-sm">Rate</Link>
            <Link href="/scores" className="btn-ghost text-sm">Scores</Link>
            {isAdmin && <Link href="/admin" className="btn-ghost text-sm text-amber-400/80 hover:text-amber-300">Admin</Link>}
            <form action="/auth/signout" method="post" className="ml-2">
              <button type="submit" className="btn-ghost text-sm text-gray-500">Sign Out</button>
            </form>
          </div>
        )}
      </div>
    </nav>
  );
}
