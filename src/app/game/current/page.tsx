import { createServerSupabase } from '@/lib/supabase/server';
import { toggleRsvp } from '@/lib/actions';
import type { Game, Teams } from '@/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export const dynamic = 'force-dynamic';

export default async function GamePage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: games } = await supabase.from('games').select('*')
    .in('status', ['open', 'closed']).order('starts_at', { ascending: true }).limit(1);
  const game: Game | null = games?.[0] ?? null;

  if (!game) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="card text-center">
          <span className="text-5xl">🏟️</span>
          <h2 className="mt-3 font-display text-xl font-bold">No upcoming game</h2>
          <p className="mt-1 text-sm text-gray-400">Check back later or ask the admin to create one.</p>
        </div>
      </div>
    );
  }

  const { data: rsvps } = await supabase.from('rsvps').select('*, profiles(id, name)')
    .eq('game_id', game.id).neq('status', 'cancelled').order('created_at', { ascending: true });
  const confirmed = (rsvps ?? []).filter((r: any) => r.status === 'confirmed');
  const waitlist = (rsvps ?? []).filter((r: any) => r.status === 'waitlist');
  const userRsvp = (rsvps ?? []).find((r: any) => r.user_id === user.id);
  const isConfirmed = userRsvp?.status === 'confirmed';
  const isWaitlisted = userRsvp?.status === 'waitlist';
  const hasRsvp = isConfirmed || isWaitlisted;
  const cutoffPassed = game.rsvp_cutoff ? new Date(game.rsvp_cutoff) < new Date() : false;

  let teams: Teams | null = null;
  let teamProfiles: Record<string, string> = {};
  const { data: teamData } = await supabase.from('teams').select('*')
    .eq('game_id', game.id).maybeSingle();
  teams = teamData;

  if (teams) {
    const allIds = [...teams.team_a, ...teams.team_b];
    const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', allIds);
    if (profiles) profiles.forEach((p: any) => { teamProfiles[p.id] = p.name; });
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <span className={`badge ${game.status === 'open' ? 'badge-green' : 'badge-red'} mb-2`}>
              {game.status.toUpperCase()}
            </span>
            <h1 className="font-display text-2xl font-bold">{game.location || 'Game Day'}</h1>
            <p className="mt-1 text-gray-400">{formatDate(game.starts_at)}</p>
            {game.rsvp_cutoff && <p className="mt-0.5 text-xs text-gray-500">RSVP cutoff: {formatDate(game.rsvp_cutoff)}</p>}
          </div>
          <div className="text-right">
            <div className="font-mono text-3xl font-bold text-emerald-400">
              {confirmed.length}<span className="text-gray-600">/{game.capacity}</span>
            </div>
            <p className="text-xs text-gray-500">confirmed</p>
          </div>
        </div>

        {game.status === 'open' && !cutoffPassed && (
          <form action={toggleRsvp} className="mt-5">
            <input type="hidden" name="game_id" value={game.id} />
            {hasRsvp ? (
              <>
                <input type="hidden" name="action" value="cancel" />
                <button type="submit" className="btn-danger w-full">
                  {isWaitlisted ? 'Leave Waitlist' : 'Cancel RSVP'}
                </button>
              </>
            ) : (
              <>
                <input type="hidden" name="action" value="join" />
                <button type="submit" className="btn-primary w-full">
                  {confirmed.length >= game.capacity ? 'Join Waitlist' : "I'm In!"}
                </button>
              </>
            )}
          </form>
        )}
        {cutoffPassed && !hasRsvp && <p className="mt-4 text-sm text-gray-500 text-center">RSVP cutoff has passed.</p>}
        {hasRsvp && (
          <div className={`mt-3 rounded-lg p-2.5 text-center text-sm font-medium ${
            isConfirmed ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            {isConfirmed ? '✓ You are confirmed!' : '⏳ You are on the waitlist'}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Confirmed ({confirmed.length})</h3>
          {confirmed.length === 0 ? <p className="text-sm text-gray-600">No players yet</p> : (
            <ol className="space-y-1.5">
              {confirmed.map((r: any, i: number) => (
                <li key={r.user_id} className="flex items-center gap-2.5 text-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-800 text-xs font-mono text-gray-400">{i + 1}</span>
                  <span className={r.user_id === user.id ? 'text-emerald-400 font-medium' : 'text-gray-300'}>
                    {r.profiles?.name ?? 'Unknown'}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="card">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Waitlist ({waitlist.length})</h3>
          {waitlist.length === 0 ? <p className="text-sm text-gray-600">No one waiting</p> : (
            <ol className="space-y-1.5">
              {waitlist.map((r: any, i: number) => (
                <li key={r.user_id} className="flex items-center gap-2.5 text-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-800 text-xs font-mono text-gray-400">{i + 1}</span>
                  <span className={r.user_id === user.id ? 'text-amber-400 font-medium' : 'text-gray-300'}>
                    {r.profiles?.name ?? 'Unknown'}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {teams && (
        <div className="card">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Teams</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
              <h4 className="mb-2 text-sm font-bold text-blue-400">Team A</h4>
              <ul className="space-y-1">
                {teams.team_a.map((id: string) => (
                  <li key={id} className={`text-sm ${id === user.id ? 'text-emerald-400 font-medium' : 'text-gray-300'}`}>
                    {teamProfiles[id] ?? id.slice(0, 8)}
                    {id === user.id && ' (you)'}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4">
              <h4 className="mb-2 text-sm font-bold text-orange-400">Team B</h4>
              <ul className="space-y-1">
                {teams.team_b.map((id: string) => (
                  <li key={id} className={`text-sm ${id === user.id ? 'text-emerald-400 font-medium' : 'text-gray-300'}`}>
                    {teamProfiles[id] ?? id.slice(0, 8)}
                    {id === user.id && ' (you)'}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
