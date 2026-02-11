export type Role = 'admin' | 'player';
export type GameStatus = 'draft' | 'open' | 'closed';
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

export const ATTRIBUTES = ['tc', 'pd', 'da', 'en', 'fi', 'iq'] as const;
export type Attribute = (typeof ATTRIBUTES)[number];

export const ATTRIBUTE_LABELS: Record<Attribute, string> = {
  tc: 'Technique',
  pd: 'Passing & Dribbling',
  da: 'Defending & Aggression',
  en: 'Endurance',
  fi: 'Finishing',
  iq: 'Game IQ',
};
