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
    const allProfiles: Record<string, string> = {};
    const { data: profs } = await service.from('profiles').select('id, name');
    if (profs) profs.forEach((p: any) => { allProfiles[p.id] = p.name; });

    // Find current active game (open or closed, NOT completed)
    const { data: activeGames } = await service.from('games').select('*')
      .in('status', ['open', 'closed']).order('starts_at', { ascending: false }).limit(1);
    const activeGame: Game | null = activeGames?.[0] ?? null;

    // Find most recent completed game (for scoring/awards)
    const { data: completedGames } = await service.from('games').select('*')
      .eq('status', 'completed').order('completed_at', { ascending: false }).limit(1);
    const lastCompleted: Game | null = completedGames?.[0] ?? null;

    // Active game data
    let rsvps: any[] = [];
    let teams: Teams | null = null;
    let formAdjs: FormAdjustment[] = [];

    if (activeGame) {
      const { data: rsvpData } = await service.from('rsvps').select('*, profiles(id, name)')
        .eq('game_id', activeGame.id).neq('status', 'cancelled').order('created_at', { ascending: true });
      rsvps = rsvpData ?? [];

      const { data: teamData } = await service.from('teams').select('*').eq('game_id', activeGame.id).maybeSingle();
      teams = teamData;

      if (activeGame.use_form_adjustments) {
        const { data: adjData } = await service.from('form_adjustments').select('*').eq('game_id', activeGame.id);
        formAdjs = adjData ?? [];
      }
    }

    // Completed game data
    let completedTeams: Teams | null = null;
    let completedVoteCount = 0;
    if (lastCompleted) {
      const { data: ctData } = await service.from('teams').select('*').eq('game_id', lastCompleted.id).maybeSingle();
      completedTeams = ctData;

      const { count } = await service.from('award_votes')
        .select('*', { count: 'exact', head: true })
        .eq('game_id', lastCompleted.id);
      completedVoteCount = count ?? 0;
    }

    // Skill profiles
    const { data: statsData } = await service.from('player_skill_profile').select('*').order('strength', { ascending: false });
    const stats: PlayerSkillProfile[] = statsData ?? [];

    const confirmed = rsvps.filter((r: any) => r.status === 'confirmed');

    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-400">Manage games, stats, and teams.</p>
        </div>

        {/* LAST COMPLETED GAME — scoring & awards */}
        {lastCompleted && completedTeams && (
          <AdminCompleteGame
            gameId={lastCompleted.id}
            isCompleted={true}
            scoreA={lastCompleted.score_team_a}
            scoreB={lastCompleted.score_team_b}
            notes={lastCompleted.notes}
            voteCount={completedVoteCount}
          />
        )}

        {/* CREATE OR EDIT ACTIVE GAME */}
        <AdminGameForm game={activeGame} />

        {/* RSVP MANAGEMENT */}
        {activeGame && (
          <AdminRsvpManager
            gameId={activeGame.id}
            allPlayers={Object.entries(allProfiles).map(([id, name]) => ({ id, name }))}
            currentRsvps={rsvps.map((r: any) => ({ user_id: r.user_id, status: r.status, name: r.profiles?.name ?? 'Unknown' }))}
          />
        )}

        {/* SKILL PROFILES */}
        <AdminStats stats={stats} profiles={allProfiles} />

        {/* FORM ADJUSTMENTS */}
        {activeGame && activeGame.use_form_adjustments && (
          <AdminFormAdjustments
            gameId={activeGame.id}
            confirmed={confirmed.map((r: any) => ({ id: r.user_id, name: r.profiles?.name ?? 'Unknown' }))}
            existing={formAdjs}
          />
        )}

        {/* TEAM GENERATION — only for active game */}
        {activeGame && (
          <AdminTeams gameId={activeGame.id} teams={teams} stats={stats} profiles={allProfiles} />
        )}

        {/* COMPLETE ACTIVE GAME — only when teams exist and game is not yet completed */}
        {activeGame && teams && (
          <AdminCompleteGame
            gameId={activeGame.id}
            isCompleted={false}
            scoreA={null}
            scoreB={null}
            notes={null}
            voteCount={0}
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
