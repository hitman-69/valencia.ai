export type Role = 'admin' | 'player';
export type GameStatus = 'draft' | 'open' | 'closed' | 'completed';
export type RsvpStatus = 'confirmed' | 'waitlist' | 'cancelled';

export interface Profile {
  id: string;
  name: string;
  role: Role;
  created_at: string;
}

export interface Game {
  id: string;
  starts_at: string;
  location: string | null;
  capacity: number;
  rsvp_cutoff: string | null;
  rating_cutoff: string | null;
  status: GameStatus;
  use_form_adjustments: boolean;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
  score_team_a: number | null;
  score_team_b: number | null;
  notes: string | null;
}

export interface Rsvp {
  game_id: string;
  user_id: string;
  status: RsvpStatus;
  created_at: string;
  updated_at: string;
  profiles?: { id: string; name: string };
}

export interface PlayerRating {
  id: string;
  rater_id: string;
  ratee_id: string;
  tc: number;
  pd: number;
  da: number;
  en: number;
  fi: number;
  iq: number;
  created_at: string;
  updated_at: string;
}

export interface PlayerSkillProfile {
  user_id: string;
  tc: number;
  pd: number;
  da: number;
  en: number;
  fi: number;
  iq: number;
  strength: number;
  n_votes: number;
  updated_at: string;
}

export interface PlayerSkillPublic {
  user_id: string;
  tc: number;
  pd: number;
  da: number;
  en: number;
  fi: number;
  iq: number;
  n_votes: number;
  updated_at: string;
}

export interface FormAdjustment {
  id: string;
  game_id: string;
  adjuster_id: string;
  user_id: string;
  tc: number;
  pd: number;
  da: number;
  en: number;
  fi: number;
  iq: number;
  note: string | null;
}

export interface Teams {
  game_id: string;
  team_a: string[];
  team_b: string[];
  cost: number;
  published: boolean;
  locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface AwardCategory {
  id: string;
  label: string;
  description: string | null;
}

export interface AwardVote {
  id: string;
  game_id: string;
  voter_id: string;
  category_id: string;
  nominee_id: string;
  created_at: string;
  updated_at: string;
}

export interface AwardResult {
  game_id: string;
  category_id: string;
  winner_id: string;
  winner_votes: number;
  runner_up_id: string | null;
  runner_up_votes: number | null;
  computed_at: string;
}

export interface PerformanceModifier {
  user_id: string;
  tc_delta: number;
  pd_delta: number;
  da_delta: number;
  en_delta: number;
  fi_delta: number;
  iq_delta: number;
  updated_at: string;
}

export const ATTRIBUTES = ['tc', 'pd', 'da', 'en', 'fi', 'iq'] as const;
export type Attribute = (typeof ATTRIBUTES)[number];

export const ATTRIBUTE_LABELS: Record<Attribute, string> = {
  tc: 'Technique',
  pd: 'Passing & Dribbling',
  da: 'Defending & Aggression',
  en: 'Endurance',
  fi: 'Finishing',
  iq: 'Game Awareness',
};

export const AWARD_EMOJIS: Record<string, string> = {
  mvp: '🏆',
  top_scorer: '⚽',
  best_defender: '🛡️',
  best_goalie: '🧤',
  most_improved: '📈',
};
