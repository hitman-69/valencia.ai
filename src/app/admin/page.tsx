import { redirect } from 'next/navigation';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { AdminGameForm } from '@/components/AdminGameForm';
import { AdminStats } from '@/components/AdminStats';
import { AdminTeams } from '@/components/AdminTeams';
import { AdminFormAdjustments } from '@/components/AdminFormAdjustments';
import { AdminCompleteGame } from '@/components/AdminCompleteGame';
import { AdminRsvpManager } from '@/components/AdminRsvpManager';
import type { Game, PlayerSkillProfile, Teams, FormAdjustment } from '@/types';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="card text-center">
            <span className="text-4xl">🔒</span>
            <h2 className="mt-3 font-display text-xl font-bold">Admin Only</h2>
          </div>
        </div>
      );
    }

    const service = await createServiceSupabase();
    const { data: games } = await service.from('games').select('*').order('starts_at', { ascending: false }).limit(5);
    const currentGame: Game | null = games?.[0] ?? null;

    let rsvps: any[] = [];
    let teams: Teams | null = null;
    let formAdjs: FormAdjustment[] = [];
    let voteCount = 0;
    const allProfiles: Record<string, string> = {};

    const { data: profs } = await service.from('profiles').select('id, name');
    if (profs) profs.forEach((p: any) => { allProfiles[p.id] = p.name; });

    if (currentGame) {
      const { data: rsvpData } = await service.from('rsvps').select('*, profiles(id, name)')
        .eq('game_id', currentGame.id).neq('status', 'cancelled').order('created_at', { ascending: true });
      rsvps = rsvpData ?? [];

      const { data: teamData } = await service.from('teams').select('*').eq('game_id', currentGame.id).maybeSingle();
      teams = teamData;

      if (currentGame.use_form_adjustments) {
        const { data: adjData } = await service.from('form_adjustments').select('*').eq('game_id', currentGame.id);
        formAdjs = adjData ?? [];
      }

      // Count award votes
      if (currentGame.status === 'completed') {
        const { count } = await service.from('award_votes')
          .select('*', { count: 'exact', head: true })
          .eq('game_id', currentGame.id);
        voteCount = count ?? 0;
      }
    }

    const { data: statsData } = await service.from('player_skill_profile').select('*').order('strength', { ascending: false });
    const stats: PlayerSkillProfile[] = statsData ?? [];

    const confirmed = rsvps.filter((r: any) => r.status === 'confirmed');
    const waitlist = rsvps.filter((r: any) => r.status === 'waitlist');

    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-400">Manage games, stats, and teams.</p>
        </div>

        <AdminGameForm game={currentGame} />

      {currentGame && (
          <AdminRsvpManager
            gameId={currentGame.id}
            allPlayers={Object.entries(allProfiles).map(([id, name]) => ({ id, name }))}
            currentRsvps={rsvps.map((r: any) => ({ user_id: r.user_id, status: r.status, name: r.profiles?.name ?? 'Unknown' }))}
          />
        )}

        <AdminStats stats={stats} profiles={allProfiles} />

        {currentGame && currentGame.use_form_adjustments && (
          <AdminFormAdjustments
            gameId={currentGame.id}
            confirmed={confirmed.map((r: any) => ({ id: r.user_id, name: r.profiles?.name ?? 'Unknown' }))}
            existing={formAdjs}
          />
        )}

        {currentGame && currentGame.status !== 'completed' && (
          <AdminTeams gameId={currentGame.id} teams={teams} stats={stats} profiles={allProfiles} />
        )}

        {currentGame && teams && (
          <AdminCompleteGame
            gameId={currentGame.id}
            isCompleted={currentGame.status === 'completed'}
            scoreA={currentGame.score_team_a}
            scoreB={currentGame.score_team_b}
            notes={currentGame.notes}
            voteCount={voteCount}
          />
        )}
      </div>
    );
  } catch (err: any) {
    return (
      <div className="card mt-10 text-center">
        <h2 className="text-red-400 font-bold text-lg mb-2">Admin Page Error</h2>
        <p className="text-sm text-gray-400 font-mono break-all">{err.message || JSON.stringify(err)}</p>
      </div>
    );
  }
}
