  import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';
import type { Game } from '@/types';

export const dynamic = 'force-dynamic';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

export default async function GamesPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: games } = await supabase.from('games').select('*')
    .eq('status', 'completed')
    .order('starts_at', { ascending: false });

  const completedGames: Game[] = games ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Game History</h1>
        <p className="mt-1 text-sm text-gray-400">Previous matches and results.</p>
      </div>

      {completedGames.length === 0 ? (
        <div className="card text-center">
          <span className="text-4xl">📋</span>
          <h2 className="mt-3 font-display text-lg font-bold">No completed games yet</h2>
          <p className="mt-1 text-sm text-gray-400">Games will appear here after they are completed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {completedGames.map((g) => {
            const margin = g.score_team_a !== null && g.score_team_b !== null
              ? Math.abs(g.score_team_a - g.score_team_b) : null;
            const isBalanced = margin !== null && margin <= 1;
            return (
              <Link key={g.id} href={`/game/${g.id}`}
                className="card block hover:border-gray-700 transition-colors group cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">{formatDate(g.starts_at)}</p>
                    <p className="font-display font-bold text-lg text-gray-200 group-hover:text-emerald-400 transition">
                      {g.location || 'Game'}
                    </p>
                  </div>
                  <div className="text-right">
                    {g.score_team_a !== null && g.score_team_b !== null ? (
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <p className="text-xs text-blue-400 uppercase">A</p>
                          <p className="font-mono text-2xl font-bold text-gray-200">{g.score_team_a}</p>
                        </div>
                        <span className="text-gray-600 text-lg">—</span>
                        <div className="text-center">
                          <p className="text-xs text-orange-400 uppercase">B</p>
                          <p className="font-mono text-2xl font-bold text-gray-200">{g.score_team_b}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="badge-yellow">No score</span>
                    )}
                  </div>
                </div>
                {isBalanced && (
                  <span className="inline-block mt-2 text-[11px] text-emerald-500">✓ Balanced match</span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
