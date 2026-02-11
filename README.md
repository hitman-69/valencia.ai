# ⚽ 5x5 Soccer Organizer V2

Weekly 5-a-side soccer organizer with **persistent player ratings**, balanced team generation, and optional per-game form adjustments.

## What Changed in V2

- **Persistent Ratings**: Players rate each other anytime (not per-game). Ratings stay and can be updated.
- **Skill Profiles**: Admin computes aggregated skill profiles from all persistent ratings.
- **Form Adjustments**: Admin can optionally tweak player stats per game (-1/0/+1 per attribute).
- **Unlock Teams**: Admin can now unlock locked teams to regenerate.

## Setup

### 1. Supabase
- Create a project at [supabase.com](https://supabase.com)
- Go to **SQL Editor** and run `supabase/migrations/002_persistent_ratings.sql`

### 2. Auth
- **Authentication** → **Providers** → Enable **Email**
- **Authentication** → **URL Configuration**:
  - Site URL: your Vercel URL
  - Redirect URLs: `https://your-url/auth/callback`

### 3. Environment Variables (Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Deploy
Upload to GitHub, import in Vercel, add env vars, deploy.

### 5. Make yourself admin
In Supabase SQL Editor:
```sql
UPDATE profiles SET role = 'admin' WHERE name = 'your-email-prefix';
```

## Usage

**Admin**: Create game → Players RSVP → Players rate each other → Compute Profiles → Generate Teams → Lock → Publish

**Players**: Sign in → RSVP → Rate players → View teams when published

## Rating Attributes
TC (Technique), PD (Passing & Dribbling), DA (Defending & Aggression), EN (Endurance), FI (Finishing), IQ (Game IQ)

**Strength** = 0.20×TC + 0.20×PD + 0.20×DA + 0.15×EN + 0.15×FI + 0.10×IQ
