'use server';

import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { gameSchema, rsvpSchema, ratingSchema, formAdjustmentSchema } from '@/lib/schemas';
import { generateTeams, clamp } from '@/lib/optimizer';
import { ATTRIBUTES } from '@/types';
import { revalidatePath } from 'next/cache';

// ---------- HELPERS ----------

async function requireAuth() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return { supabase, user };
}

async function requireAdmin() {
  const { supabase, user } = await requireAuth();
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') throw new Error('Forbidden');
  return { supabase, user };
}

// ---------- GAMES ----------

export async function createGame(formData: FormData) {
  await requireAdmin();
  const service = await createServiceSupabase();
  const parsed = gameSchema.parse({
    starts_at: formData.get('starts_at'),
    location: formData.get('location') || undefined,
    capacity: Number(formData.get('capacity') || 10),
    rsvp_cutoff: formData.get('rsvp_cutoff') || undefined,
    rating_cutoff: formData.get('rating_cutoff') || undefined,
    status: (formData.get('status') as string) || 'open',
    use_form_adjustments: formData.get('use_form_adjustments') === 'true',
  });
  const { error } = await service.from('games').insert({
    ...parsed,
    starts_at: new Date(parsed.starts_at).toISOString(),
    rsvp_cutoff: parsed.rsvp_cutoff ? new Date(parsed.rsvp_cutoff).toISOString() : null,
    rating_cutoff: parsed.rating_cutoff ? new Date(parsed.rating_cutoff).toISOString() : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/');
}

export async function updateGame(gameId: string, formData: FormData) {
  await requireAdmin();
  const service = await createServiceSupabase();
  const parsed = gameSchema.parse({
    starts_at: formData.get('starts_at'),
    location: formData.get('location') || undefined,
    capacity: Number(formData.get('capacity') || 10),
    rsvp_cutoff: formData.get('rsvp_cutoff') || undefined,
    rating_cutoff: formData.get('rating_cutoff') || undefined,
    status: (formData.get('status') as string) || 'open',
    use_form_adjustments: formData.get('use_form_adjustments') === 'true',
  });
  const { error } = await service.from('games').update({
    ...parsed,
    starts_at: new Date(parsed.starts_at).toISOString(),
    rsvp_cutoff: parsed.rsvp_cutoff ? new Date(parsed.rsvp_cutoff).toISOString() : null,
    rating_cutoff: parsed.rating_cutoff ? new Date(parsed.rating_cutoff).toISOString() : null,
  }).eq('id', gameId);
  if (error) throw new Error(error.message);
  revalidatePath('/');
}

// ---------- RSVP ----------

export async function toggleRsvp(formData: FormData) {
  const { supabase, user } = await requireAuth();
  const parsed = rsvpSchema.parse({
    game_id: formData.get('game_id'),
    action: formData.get('action'),
  });
  const { data: game } = await supabase.from('games')
    .select('capacity, rsvp_cutoff, status').eq('id', parsed.game_id).single();
  if (!game || game.status === 'closed') throw new Error('Game is closed');
  if (game.rsvp_cutoff && new Date(game.rsvp_cutoff) < new Date()) throw new Error('RSVP cutoff passed');

  if (parsed.action === 'join') {
    const { count } = await supabase.from('rsvps')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', parsed.game_id).eq('status', 'confirmed');
    const status = (count ?? 0) < game.capacity ? 'confirmed' : 'waitlist';
    const { error } = await supabase.from('rsvps').upsert({
      game_id: parsed.game_id, user_id: user.id, status, updated_at: new Date().toISOString(),
    }, { onConflict: 'game_id,user_id' });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('rsvps')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('game_id', parsed.game_id).eq('user_id', user.id);
    if (error) throw new Error(error.message);
    // Auto-promote
    const service = await createServiceSupabase();
    const { data: waitlisted } = await service.from('rsvps')
      .select('user_id').eq('game_id', parsed.game_id).eq('status', 'waitlist')
      .order('created_at', { ascending: true }).limit(1);
    if (waitlisted && waitlisted.length > 0) {
      await service.from('rsvps')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('game_id', parsed.game_id).eq('user_id', waitlisted[0].user_id);
    }
  }
  revalidatePath('/');
}

// ---------- PERSISTENT RATINGS ----------

export async function submitRating(formData: FormData) {
  const { supabase, user } = await requireAuth();
  const parsed = ratingSchema.parse({
    ratee_id: formData.get('ratee_id'),
    tc: Number(formData.get('tc')),
    pd: Number(formData.get('pd')),
    da: Number(formData.get('da')),
    en: Number(formData.get('en')),
    fi: Number(formData.get('fi')),
    iq: Number(formData.get('iq')),
  });
  if (parsed.ratee_id === user.id) throw new Error('Cannot rate yourself');
  const { error } = await supabase.from('player_ratings').upsert({
    rater_id: user.id,
    ratee_id: parsed.ratee_id,
    tc: parsed.tc, pd: parsed.pd, da: parsed.da,
    en: parsed.en, fi: parsed.fi, iq: parsed.iq,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'rater_id,ratee_id' });
  if (error) throw new Error(error.message);
  revalidatePath('/vote');
}

// ---------- ADMIN: COMPUTE SKILL PROFILES ----------

export async function computeSkillProfiles() {
  await requireAdmin();
  const service = await createServiceSupabase();

  // Get all players who have been rated
  const { data: allRatings } = await service.from('player_ratings').select('*');
  if (!allRatings || allRatings.length === 0) throw new Error('No ratings found');

  // Group by ratee
  const byRatee = new Map<string, any[]>();
  allRatings.forEach((r: any) => {
    if (!byRatee.has(r.ratee_id)) byRatee.set(r.ratee_id, []);
    byRatee.get(r.ratee_id)!.push(r);
  });

  // Delete old profiles
  await service.from('player_skill_profile').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');

  // Compute for each rated player
  const attrs = ['tc', 'pd', 'da', 'en', 'fi', 'iq'] as const;

  for (const [userId, ratings] of Array.from(byRatee.entries())) {
    const result: any = { user_id: userId, updated_at: new Date().toISOString() };
    let nVotes = 0;

    for (const attr of attrs) {
      const vals = ratings.map((r: any) => Number(r[attr])).sort((a: number, b: number) => a - b);
      const n = vals.length;
      let trimmed = vals;

      if (n >= 8) {
        const drop = Math.round(n * 0.1);
        trimmed = vals.slice(drop, n - drop);
      } else if (n >= 4) {
        trimmed = vals.slice(1, n - 1);
      }

      const avg = trimmed.reduce((s: number, v: number) => s + v, 0) / trimmed.length;
      result[attr] = Math.round(avg * 100) / 100;

      if (attr === 'tc') nVotes = n;
    }

    result.strength = Math.round(
      (0.20 * result.tc + 0.20 * result.pd + 0.20 * result.da +
       0.15 * result.en + 0.15 * result.fi + 0.10 * result.iq) * 1000
    ) / 1000;
    result.n_votes = nVotes;

    await service.from('player_skill_profile').upsert(result, { onConflict: 'user_id' });
  }

  revalidatePath('/admin');
}

// ---------- ADMIN: FORM ADJUSTMENTS ----------

export async function saveFormAdjustment(formData: FormData) {
  const { user } = await requireAdmin();
  const service = await createServiceSupabase();
  const parsed = formAdjustmentSchema.parse({
    game_id: formData.get('game_id'),
    user_id: formData.get('user_id'),
    tc: Number(formData.get('tc') || 0),
    pd: Number(formData.get('pd') || 0),
    da: Number(formData.get('da') || 0),
    en: Number(formData.get('en') || 0),
    fi: Number(formData.get('fi') || 0),
    iq: Number(formData.get('iq') || 0),
    note: (formData.get('note') as string) || undefined,
  });
  const { error } = await service.from('form_adjustments').upsert({
    game_id: parsed.game_id,
    adjuster_id: user.id,
    user_id: parsed.user_id,
    tc: parsed.tc, pd: parsed.pd, da: parsed.da,
    en: parsed.en, fi: parsed.fi, iq: parsed.iq,
    note: parsed.note || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'game_id,adjuster_id,user_id' });
  if (error) throw new Error(error.message);
  revalidatePath('/admin');
}

// ---------- ADMIN: GENERATE TEAMS ----------

export async function generateTeamsAction(gameId: string) {
  await requireAdmin();
  const service = await createServiceSupabase();

  const { data: existingTeam } = await service.from('teams').select('locked').eq('game_id', gameId).single();
  if (existingTeam?.locked) return { error: 'Teams are locked. Unlock first.' };

  const { data: game } = await service.from('games').select('use_form_adjustments').eq('id', gameId).single();

  const { data: rsvps } = await service.from('rsvps')
    .select('user_id').eq('game_id', gameId).eq('status', 'confirmed');
  if (!rsvps || rsvps.length !== 10) return { error: 'Need 10 confirmed players, found ' + (rsvps?.length ?? 0) };

  const playerIds = rsvps.map((r: any) => r.user_id);

  const { data: profiles } = await service.from('player_skill_profile')
    .select('*').in('user_id', playerIds);
  const profileMap = new Map<string, any>();
  (profiles ?? []).forEach((p: any) => profileMap.set(p.user_id, p));

  let adjMap = new Map<string, any>();
  if (game?.use_form_adjustments) {
    const { data: adjs } = await service.from('form_adjustments')
      .select('*').eq('game_id', gameId).in('user_id', playerIds);
    if (adjs) {
      const grouped = new Map<string, any[]>();
      adjs.forEach((a: any) => {
        if (!grouped.has(a.user_id)) grouped.set(a.user_id, []);
        grouped.get(a.user_id)!.push(a);
      });
      for (const [uid, entries] of Array.from(grouped.entries())) {
        const avg: any = { tc: 0, pd: 0, da: 0, en: 0, fi: 0, iq: 0 };
        ATTRIBUTES.forEach((attr) => {
          avg[attr] = entries.reduce((s: number, e: any) => s + e[attr], 0) / entries.length;
        });
        adjMap.set(uid, avg);
      }
    }
  }

  const DEFAULT_BASE = 3.0;
  const players = playerIds.map((uid: string) => {
    const sp = profileMap.get(uid);
    const base: any = {};
    ATTRIBUTES.forEach((attr) => {
      base[attr] = sp ? Number(sp[attr]) : DEFAULT_BASE;
    });
    if (game?.use_form_adjustments && adjMap.has(uid)) {
      const adj = adjMap.get(uid)!;
      ATTRIBUTES.forEach((attr) => {
        base[attr] = clamp(base[attr] + adj[attr], 1, 5);
      });
    }
    const strength = 0.20 * base.tc + 0.20 * base.pd + 0.20 * base.da
      + 0.15 * base.en + 0.15 * base.fi + 0.10 * base.iq;
    return { user_id: uid, ...base, strength };
  });

  const result = generateTeams(players);
  const { error } = await service.from('teams').upsert({
    game_id: gameId,
    team_a: result.team_a,
    team_b: result.team_b,
    cost: result.cost,
    published: false,
    locked: false,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'game_id' });
  if (error) return { error: error.message };
  revalidatePath('/admin');
  return { error: null };
}
  // Build final player stats
  const DEFAULT_BASE = 3.0;
  const players = playerIds.map((uid: string) => {
    const sp = profileMap.get(uid);
    const base: any = {};
    ATTRIBUTES.forEach((attr) => {
      base[attr] = sp ? Number(sp[attr]) : DEFAULT_BASE;
    });

    // Apply form adjustments
    if (game?.use_form_adjustments && adjMap.has(uid)) {
      const adj = adjMap.get(uid)!;
      ATTRIBUTES.forEach((attr) => {
        base[attr] = clamp(base[attr] + adj[attr], 1, 5);
      });
    }

    const strength = 0.20 * base.tc + 0.20 * base.pd + 0.20 * base.da
      + 0.15 * base.en + 0.15 * base.fi + 0.10 * base.iq;

    return { user_id: uid, ...base, strength };
  });

  const result = generateTeams(players);
  const { error } = await service.from('teams').upsert({
    game_id: gameId,
    team_a: result.team_a,
    team_b: result.team_b,
    cost: result.cost,
    published: false,
    locked: false,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'game_id' });
  if (error) throw new Error(error.message);
  revalidatePath('/admin');
}

// ---------- ADMIN: LOCK / UNLOCK / PUBLISH ----------

export async function lockTeams(gameId: string) {
  await requireAdmin();
  const service = await createServiceSupabase();
  const { error } = await service.from('teams')
    .update({ locked: true, updated_at: new Date().toISOString() }).eq('game_id', gameId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin');
}

export async function unlockTeams(gameId: string) {
  await requireAdmin();
  const service = await createServiceSupabase();
  const { error } = await service.from('teams')
    .update({ locked: false, updated_at: new Date().toISOString() }).eq('game_id', gameId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin');
}

export async function togglePublish(gameId: string, publish: boolean) {
  await requireAdmin();
  const service = await createServiceSupabase();
  const { error } = await service.from('teams')
    .update({ published: publish, updated_at: new Date().toISOString() }).eq('game_id', gameId);
  if (error) throw new Error(error.message);
  revalidatePath('/');
}
