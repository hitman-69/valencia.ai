import { createServerSupabase } from '@/lib/supabase/server';
import { VoteForm } from '@/components/VoteForm';
import type { PlayerRating } from '@/types';

export const dynamic = 'force-dynamic';

export default async function VotePage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get all players excluding self
  const { data: profiles } = await supabase.from('profiles').select('id, name').neq('id', user.id);
  const players = (profiles ?? []).map((p: any) => ({ id: p.id, name: p.name }));

  // Get current user's existing ratings
  const { data: existingRatings } = await supabase.from('player_ratings')
    .select('*').eq('rater_id', user.id);
  const ratingsMap: Record<string, PlayerRating> = {};
  (existingRatings ?? []).forEach((r: any) => { ratingsMap[r.ratee_id] = r; });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Rate Players</h1>
        <p className="mt-1 text-sm text-gray-400">
          Rate each player from 1 to 5 on six attributes. You can update ratings anytime.
        </p>
      </div>
      {players.length === 0 ? (
        <div className="card text-center text-gray-500"><p>No other players registered yet.</p></div>
      ) : (
        <VoteForm players={players} existingRatings={ratingsMap} />
      )}
    </div>
  );
}
