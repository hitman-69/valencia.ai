import { createServerSupabase } from '@/lib/supabase/server';
import { VoteAwardsForm } from '@/components/VoteAwardsForm';
import type { AwardCategory, AwardVote } from '@/types';

export const dynamic = 'force-dynamic';

export default async function VoteAwardsPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: game } = await supabase.from('games').select('*').eq('id', params.id).single();
  if (!game || game.status !== 'completed') {
    return (
      <div className="card mt-10 text-center">
        <span className="text-4xl">🗳️</span>
        <h2 className="mt-3 font-display text-xl font-bold">Voting not available</h2>
        <p className="mt-1 text-sm text-gray-400">This game must be completed before voting opens.</p>
      </div>
    );
  }

  // Get teams to determine participants
  const { data: teamData } = await supabase.from('teams').select('*')
    .eq('game_id', game.id).maybeSingle();
  if (!teamData) {
    return (
      <div className="card mt-10 text-center">
        <span className="text-4xl">🗳️</span>
        <h2 className="mt-3 font-display text-xl font-bold">No teams found</h2>
        <p className="mt-1 text-sm text-gray-400">Teams need to be generated before voting.</p>
      </div>
    );
  }

  const participantIds = [...teamData.team_a, ...teamData.team_b];

  // Get participant names (exclude self for nominees)
  const { data: profiles } = await supabase.from('profiles')
    .select('id, name').in('id', participantIds);
  const allPlayers = (profiles ?? []).map((p: any) => ({ id: p.id, name: p.name }));
  const nominees = allPlayers.filter((p) => p.id !== user.id);

  // Get categories
  const { data: catData } = await supabase.from('award_categories').select('*');
  const categories: AwardCategory[] = catData ?? [];

  // Get user's existing votes
  const { data: existingVotes } = await supabase.from('award_votes')
    .select('*').eq('game_id', game.id).eq('voter_id', user.id);
  const votesMap: Record<string, string> = {};
  (existingVotes ?? []).forEach((v: any) => { votesMap[v.category_id] = v.nominee_id; });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Vote for Awards</h1>
        <p className="mt-1 text-sm text-gray-400">
          {game.location || 'Game'} — Pick the best players in each category.
        </p>
      </div>
      <VoteAwardsForm
        gameId={game.id}
        categories={categories}
        nominees={nominees}
        existingVotes={votesMap}
      />
    </div>
  );
}
