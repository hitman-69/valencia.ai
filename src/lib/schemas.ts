import { z } from 'zod';

export const gameSchema = z.object({
  starts_at: z.string().min(1, 'Date is required'),
  location: z.string().optional(),
  capacity: z.number().int().min(2).max(30).default(10),
  rsvp_cutoff: z.string().optional(),
  rating_cutoff: z.string().optional(),
  status: z.enum(['draft', 'open', 'closed']).default('open'),
  use_form_adjustments: z.boolean().default(false),
});

export const rsvpSchema = z.object({
  game_id: z.string().uuid(),
  action: z.enum(['join', 'cancel']),
});

export const ratingSchema = z.object({
  ratee_id: z.string().uuid(),
  tc: z.number().int().min(1).max(5),
  pd: z.number().int().min(1).max(5),
  da: z.number().int().min(1).max(5),
  en: z.number().int().min(1).max(5),
  fi: z.number().int().min(1).max(5),
  iq: z.number().int().min(1).max(5),
});

export const formAdjustmentSchema = z.object({
  game_id: z.string().uuid(),
  user_id: z.string().uuid(),
  tc: z.number().int().min(-1).max(1),
  pd: z.number().int().min(-1).max(1),
  da: z.number().int().min(-1).max(1),
  en: z.number().int().min(-1).max(1),
  fi: z.number().int().min(-1).max(1),
  iq: z.number().int().min(-1).max(1),
  note: z.string().optional(),
});
