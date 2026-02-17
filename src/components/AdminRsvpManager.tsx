// ---------- ADMIN: MANAGE RSVPs ----------

export async function adminAddPlayer(gameId: string, userId: string): Promise<{ error: string | null }> {
  await requireAdmin();
  const service = await createServiceSupabase();

  const { data: game } = await service.from('games').select('capacity').eq('id', gameId).single();
  if (!game) return { error: 'Game not found' };

  const { count } = await service.from('rsvps')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', gameId).eq('status', 'confirmed');

  const status = (count ?? 0) < game.capacity ? 'confirmed' : 'waitlist';

  const { error } = await service.from('rsvps').upsert({
    game_id: gameId,
    user_id: userId,
    status,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'game_id,user_id' });

  if (error) return { error: error.message };
  revalidatePath('/admin');
  revalidatePath('/game/current');
  return { error: null };
}

export async function adminRemovePlayer(gameId: string, userId: string): Promise<{ error: string | null }> {
  await requireAdmin();
  const service = await createServiceSupabase();

  const { error } = await service.from('rsvps')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('game_id', gameId).eq('user_id', userId);

  if (error) return { error: error.message };

  const { data: waitlisted } = await service.from('rsvps')
    .select('user_id').eq('game_id', gameId).eq('status', 'waitlist')
    .order('created_at', { ascending: true }).limit(1);
  if (waitlisted && waitlisted.length > 0) {
    await service.from('rsvps')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('game_id', gameId).eq('user_id', waitlisted[0].user_id);
  }

  revalidatePath('/admin');
  revalidatePath('/game/current');
  return { error: null };
}
