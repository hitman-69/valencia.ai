-- ============================================================
-- 5x5 Soccer Organizer V2 — Persistent Ratings
-- Run this AFTER the initial migration, or standalone
-- ============================================================

-- 0. EXTENSIONS
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. HELPER FUNCTION
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- 2. TABLES (keep profiles, games, rsvps, teams from v1)
-- ============================================================

-- profiles (unchanged, create only if not exists)
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  role       text not null default 'player'
                  check (role in ('admin','player')),
  created_at timestamptz default now()
);

-- games (add use_form_adjustments)
create table if not exists public.games (
  id                    uuid primary key default gen_random_uuid(),
  starts_at             timestamptz not null,
  location              text,
  capacity              int not null default 10,
  rsvp_cutoff           timestamptz,
  rating_cutoff         timestamptz,
  status                text not null default 'open'
                            check (status in ('draft','open','closed')),
  use_form_adjustments  boolean not null default false,
  created_by            uuid references public.profiles(id),
  created_at            timestamptz default now()
);

-- Add column if table already existed
do $$ begin
  alter table public.games add column if not exists use_form_adjustments boolean not null default false;
exception when others then null;
end $$;

-- rsvps (unchanged)
create table if not exists public.rsvps (
  game_id    uuid references public.games(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  status     text not null check (status in ('confirmed','waitlist','cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (game_id, user_id)
);

-- teams (unchanged)
create table if not exists public.teams (
  game_id    uuid primary key references public.games(id) on delete cascade,
  team_a     uuid[] not null,
  team_b     uuid[] not null,
  cost       numeric not null,
  published  boolean not null default false,
  locked     boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- NEW: Persistent player ratings (no game_id)
-- ============================================================
create table if not exists public.player_ratings (
  id         uuid primary key default gen_random_uuid(),
  rater_id   uuid not null references public.profiles(id) on delete cascade,
  ratee_id   uuid not null references public.profiles(id) on delete cascade,
  tc         int not null check (tc between 1 and 5),
  pd         int not null check (pd between 1 and 5),
  da         int not null check (da between 1 and 5),
  en         int not null check (en between 1 and 5),
  fi         int not null check (fi between 1 and 5),
  iq         int not null check (iq between 1 and 5),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint no_self_rating check (rater_id <> ratee_id),
  unique (rater_id, ratee_id)
);

-- ============================================================
-- NEW: Persistent aggregated skill profile (admin-only)
-- ============================================================
create table if not exists public.player_skill_profile (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  tc         numeric,
  pd         numeric,
  da         numeric,
  en         numeric,
  fi         numeric,
  iq         numeric,
  strength   numeric,
  n_votes    int,
  updated_at timestamptz default now()
);

-- ============================================================
-- NEW: Per-game form adjustments (admin-only)
-- ============================================================
create table if not exists public.form_adjustments (
  id          uuid primary key default gen_random_uuid(),
  game_id     uuid not null references public.games(id) on delete cascade,
  adjuster_id uuid not null references public.profiles(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  tc          int not null default 0 check (tc between -1 and 1),
  pd          int not null default 0 check (pd between -1 and 1),
  da          int not null default 0 check (da between -1 and 1),
  en          int not null default 0 check (en between -1 and 1),
  fi          int not null default 0 check (fi between -1 and 1),
  iq          int not null default 0 check (iq between -1 and 1),
  note        text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  constraint no_self_adjust check (adjuster_id <> user_id),
  unique (game_id, adjuster_id, user_id)
);

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.rsvps enable row level security;
alter table public.teams enable row level security;
alter table public.player_ratings enable row level security;
alter table public.player_skill_profile enable row level security;
alter table public.form_adjustments enable row level security;

-- Drop existing policies if re-running
do $$ begin
  -- profiles
  drop policy if exists "profiles_select" on public.profiles;
  drop policy if exists "profiles_update_own" on public.profiles;
  drop policy if exists "profiles_insert_own" on public.profiles;
  -- games
  drop policy if exists "games_select" on public.games;
  drop policy if exists "games_insert_admin" on public.games;
  drop policy if exists "games_update_admin" on public.games;
  drop policy if exists "games_delete_admin" on public.games;
  -- rsvps
  drop policy if exists "rsvps_select" on public.rsvps;
  drop policy if exists "rsvps_insert_own" on public.rsvps;
  drop policy if exists "rsvps_update_own_or_admin" on public.rsvps;
  -- teams
  drop policy if exists "teams_admin_rw" on public.teams;
  drop policy if exists "teams_published_read" on public.teams;
  -- new tables
  drop policy if exists "pr_select" on public.player_ratings;
  drop policy if exists "pr_insert" on public.player_ratings;
  drop policy if exists "pr_update" on public.player_ratings;
  drop policy if exists "pr_delete" on public.player_ratings;
  drop policy if exists "psp_admin" on public.player_skill_profile;
  drop policy if exists "fa_admin" on public.form_adjustments;
end $$;

-- PROFILES
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert with check (id = auth.uid());

-- GAMES
create policy "games_select" on public.games for select using (true);
create policy "games_insert_admin" on public.games for insert with check (public.is_admin());
create policy "games_update_admin" on public.games for update using (public.is_admin());
create policy "games_delete_admin" on public.games for delete using (public.is_admin());

-- RSVPS
create policy "rsvps_select" on public.rsvps for select using (true);
create policy "rsvps_insert_own" on public.rsvps for insert with check (user_id = auth.uid() or public.is_admin());
create policy "rsvps_update_own_or_admin" on public.rsvps for update using (user_id = auth.uid() or public.is_admin());

-- TEAMS
create policy "teams_admin_rw" on public.teams for all using (public.is_admin());
create policy "teams_published_read" on public.teams for select using (
  published = true
  and exists (
    select 1 from public.rsvps
    where rsvps.game_id = teams.game_id
      and rsvps.user_id = auth.uid()
      and rsvps.status = 'confirmed'
  )
);

-- PLAYER RATINGS (persistent)
create policy "pr_select" on public.player_ratings for select using (rater_id = auth.uid() or public.is_admin());
create policy "pr_insert" on public.player_ratings for insert with check (rater_id = auth.uid());
create policy "pr_update" on public.player_ratings for update using (rater_id = auth.uid()) with check (rater_id = auth.uid());
create policy "pr_delete" on public.player_ratings for delete using (rater_id = auth.uid());

-- PLAYER SKILL PROFILE (admin-only)
create policy "psp_admin" on public.player_skill_profile for all using (public.is_admin());

-- FORM ADJUSTMENTS (admin-only)
create policy "fa_admin" on public.form_adjustments for all using (public.is_admin());

-- ============================================================
-- 4. AGGREGATION FUNCTION
-- ============================================================

create or replace function public.compute_skill_profiles()
returns void
language plpgsql
security definer
as $$
declare
  rec record;
  attr text;
  attr_vals numeric[];
  attr_n int;
  attr_drop int;
  avg_val numeric;
  v_tc numeric; v_pd numeric; v_da numeric;
  v_en numeric; v_fi numeric; v_iq numeric;
  v_n int;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  delete from public.player_skill_profile;

  for rec in select id from public.profiles
  loop
    v_tc := 0; v_pd := 0; v_da := 0;
    v_en := 0; v_fi := 0; v_iq := 0;
    v_n := 0;

    for attr in select unnest(array['tc','pd','da','en','fi','iq'])
    loop
      execute format(
        'select array_agg(r.%I order by r.%I) from public.player_ratings r where r.ratee_id = $1',
        attr, attr
      ) into attr_vals using rec.id;

      if attr_vals is null or array_length(attr_vals, 1) is null then
        avg_val := null;
        attr_n := 0;
      else
        attr_n := array_length(attr_vals, 1);
        if attr_n >= 8 then
          attr_drop := round(attr_n * 0.1);
          attr_vals := attr_vals[(attr_drop + 1):(attr_n - attr_drop)];
        elsif attr_n >= 4 then
          attr_vals := attr_vals[2:(attr_n - 1)];
        end if;
        select avg(v) into avg_val from unnest(attr_vals) as v;
      end if;

      case attr
        when 'tc' then v_tc := coalesce(avg_val, 0);
        when 'pd' then v_pd := coalesce(avg_val, 0);
        when 'da' then v_da := coalesce(avg_val, 0);
        when 'en' then v_en := coalesce(avg_val, 0);
        when 'fi' then v_fi := coalesce(avg_val, 0);
        when 'iq' then v_iq := coalesce(avg_val, 0);
      end case;

      if attr = 'tc' then v_n := attr_n; end if;
    end loop;

    if v_n > 0 then
      insert into public.player_skill_profile
        (user_id, tc, pd, da, en, fi, iq, strength, n_votes, updated_at)
      values (
        rec.id,
        round(v_tc, 2), round(v_pd, 2), round(v_da, 2),
        round(v_en, 2), round(v_fi, 2), round(v_iq, 2),
        round(0.20*v_tc + 0.20*v_pd + 0.20*v_da + 0.15*v_en + 0.15*v_fi + 0.10*v_iq, 3),
        v_n,
        now()
      );
    end if;
  end loop;
end;
$$;

-- ============================================================
-- 5. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'player'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 6. INDEXES
-- ============================================================
create index if not exists idx_pr_ratee on public.player_ratings(ratee_id);
create index if not exists idx_pr_rater on public.player_ratings(rater_id);
create index if not exists idx_rsvps_game on public.rsvps(game_id);
create index if not exists idx_games_starts on public.games(starts_at desc);
create index if not exists idx_fa_game on public.form_adjustments(game_id);
