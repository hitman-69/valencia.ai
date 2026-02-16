import { createServerSupabase } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Game, Teams, AwardResult, AwardCategory } from '@/types';
import { AWARD_EMOJIS } from '@/types';

export const dynamic = 'force-dynamic';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default async function GameDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: game } = await supabase.from('games').select('*').eq('id', params.id).single();
  if (!game) {
    return (
      <div className="card mt-10 text-center">
        <h2 className="font-display text-xl font-bold">Game not found</h2>
      </div>
    );
  }

  // Teams
  const { data: teamData } = await supabase.from('teams').select('*')
    .eq('game_id', game.id).maybeSingle();
  const teams: Teams | null = teamData;

  const teamProfiles: Record<string, string> = {};
  if (teams) {
    const allIds = [...teams.team_a, ...teams.team_b];
    const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', allIds);
    if (profiles) profiles.forEach((p: any) => { teamProfiles[p.id] = p.name; });
  }

  // Award results
  let awardResults: AwardResult[] = [];
  let categories: AwardCategory[] = [];
  if (game.status === 'completed') {
    const { data: arData } = await supabase.from('award_results')
      .select('*').eq('game_id', game.id);
    awardResults = arData ?? [];

    const { data: catData } = await supabase.from('award_categories').select('*');
    categories = catData ?? [];
  }

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const allProfileIds = new Set<string>();
  awardResults.forEach((ar) => {
    allProfileIds.add(ar.winner_id);
    if (ar.runner_up_id) allProfileIds.add(ar.runner_up_id);
  });
  const awardsProfileMap: Record<string, string> = { ...teamProfiles };
  if (allProfileIds.size > 0) {
    const { data: profs } = await supabase.from('profiles')
      .select('id, name').in('id', Array.from(allProfileIds));
    if (profs) profs.forEach((p: any) => { awardsProfileMap[p.id] = p.name; });
  }

  // Check if user has voted
  let userVoted = false;
  if (game.status === 'completed') {
    const { count } = await supabase.from('award_votes')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', game.id).eq('voter_id', user.id);
    userVoted = (count ?? 0) > 0;
  }

  const margin = game.score_team_a !== null && game.score_team_b !== null
    ? Math.abs(game.score_team_a - game.score_team_b) : null;

  return (
    <div className="space-y-6">
      <Link href="/games" className="text-sm text-gray-500 hover:text-gray-300 transition">
        ← Back to history
      </Link>

      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <span className={`badge ${game.status === 'completed' ? 'badge-blue' : game.status === 'open' ? 'badge-green' : 'badge-yellow'} mb-2`}>
              {game.status.toUpperCase()}
            </span>
            <h1 className="font-display text-2xl font-bold">{game.location || 'Game'}</h1>
            <p className="mt-1 text-gray-400">{formatDate(game.starts_at)}</p>
          </div>
        </div>

        {game.score_team_a !== null && game.score_team_b !== null && (
          <div className="mt-6 flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-xs text-blue-400 uppercase font-semibold mb-1">Team A</p>
              <p className="font-mono text-5xl font-bold text-gray-100">{game.score_team_a}</p>
            </div>
            <span className="text-gray-600 text-3xl font-light">—</span>
            <div className="text-center">
              <p className="text-xs text-orange-400 uppercase font-semibold mb-1">Team B</p>
              <p className="font-mono text-5xl font-bold text-gray-100">{game.score_team_b}</p>
            </div>
          </div>
        )}
        {margin !== null && (
          <p className={`mt-3 text-center text-xs ${margin <= 1 ? 'text-emerald-500' : margin <= 3 ? 'text-amber-500' : 'text-red-400'}`}>
            {margin === 0 ? 'Draw!' : `Margin: ${margin} goal${margin > 1 ? 's' : ''}`}
            {margin <= 1 && ' — Balanced match ✓'}
          </p>
        )}
        {game.notes && <p className="mt-3 text-sm text-gray-500 text-center italic">{game.notes}</p>}
      </div>

      {teams && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card border-blue-500/20 bg-blue-500/5">
            <h3 className="text-sm font-bold text-blue-400 mb-3">Team A</h3>
            <ul className="space-y-1.5">
              {teams.team_a.map((id: string) => (
                <li key={id} className={`text-sm ${id === user.id ? 'text-emerald-400 font-medium' : 'text-gray-300'}`}>
                  {teamProfiles[id] ?? id.slice(0, 8)}
                  {id === user.id && ' (you)'}
                </li>
              ))}
            </ul>
          </div>
          <div className="card border-orange-500/20 bg-orange-500/5">
            <h3 className="text-sm font-bold text-orange-400 mb-3">Team B</h3>
            <ul className="space-y-1.5">
              {teams.team_b.map((id: string) => (
                <li key={id} className={`text-sm ${id === user.id ? 'text-emerald-400 font-medium' : 'text-gray-300'}`}>
                  {teamProfiles[id] ?? id.slice(0, 8)}
                  {id === user.id && ' (you)'}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {game.status === 'completed' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Awards</h3>
            {!userVoted && teams && (
              <Link href={`/game/${game.id}/vote-awards`} className="btn-primary text-xs">
                Vote Now
              </Link>
            )}
            {userVoted && (
              <Link href={`/game/${game.id}/vote-awards`} className="btn-secondary text-xs">
                Update Votes
              </Link>
            )}
          </div>
          {awardResults.length === 0 ? (
            <p className="text-sm text-gray-600">No award results yet. Vote and ask the admin to compute results.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {awardResults.map((ar) => {
                const cat = catMap.get(ar.category_id);
                const emoji = AWARD_EMOJIS[ar.category_id] || '🏅';
                return (
                  <div key={ar.category_id} className="rounded-lg border border-gray-800 p-3">
                    <p className="text-xs text-gray-500 mb-1">{emoji} {cat?.label ?? ar.category_id}</p>
                    <p className="font-display font-bold text-gray-200">
                      {awardsProfileMap[ar.winner_id] ?? 'Unknown'}
                      <span className="ml-1.5 font-mono text-xs text-gray-500">({ar.winner_votes} votes)</span>
                    </p>
                    {ar.runner_up_id && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Runner-up: {awardsProfileMap[ar.runner_up_id] ?? 'Unknown'} ({ar.runner_up_votes})
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
