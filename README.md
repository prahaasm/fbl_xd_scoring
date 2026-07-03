# FBL XD Tournament — July 2026 (Playzone)

Live scoring app for a one-day mixed-doubles badminton tournament: 2 groups, round-robin
league, then a 4-match knockout bracket. Built with Next.js 15 (App Router), TypeScript,
Tailwind CSS and Supabase (Postgres + Realtime). No auth libraries, no Docker, no Prisma —
just enough to run reliably tomorrow morning.

## 1. Use your existing Supabase project

Everything lives in its own **`fbl_scoring` schema**, so it's fully isolated from any tables
you already have in `public` — nothing to rename, nothing to collide with.

1. Open your project's **SQL Editor** and run, in order:
   - `supabase/schema.sql` — creates the `fbl_scoring` schema plus its `teams` and `matches`
     tables, RLS policies, grants, and enables realtime on `fbl_scoring.matches`.
   - `supabase/seed.sql` — inserts the 14 teams and all 46 matches (42 group + 4 knockout)
     exactly as specified for this tournament. Safe to re-run — it truncates and re-seeds.
2. Expose the schema to the API: **Project Settings → Data API → Exposed schemas** → add
   `fbl_scoring` to the list (alongside `public`) → Save. Without this step the app's
   Supabase client calls will 404 even though the tables exist.
3. Open **Project Settings → API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` key (keep this secret — server-only)

## 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the three values from step 1:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 3. Run locally (one command)

```bash
npm install && npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app is fully seeded and usable
immediately — no extra setup steps.

## 4. Login credentials

Hardcoded in `data/users.json` (cookie-based session, no JWT/OAuth — fine for one day):

| Username  | Password  | Role    | Lands on   |
|-----------|-----------|---------|------------|
| admin     | admin2026 | admin   | `/dashboard` |
| referee1  | court1    | court1  | `/court/1` |
| referee2  | court2    | court2  | `/court/2` |
| referee3  | court3    | court3  | `/court/3` |

Each referee only ever sees their own court's matches. Admin sees and can edit everything.

## 5. How the tournament flows

- **Home (`/`)** — tournament name/venue, live/upcoming/completed matches, links to
  leaderboard, live scores and login.
- **Referee screens (`/court/1`, `/court/2`, `/court/3`)** — one match at a time, big
  +/- buttons, Start / Finish / Undo / Reset / Next Match. Reaching 21 points auto-declares
  the winner (golden point, no deuce) with a beep + confetti, then auto-advances.
- **Admin dashboard (`/dashboard`)** — every court, inline score editing, standings, and a
  **Generate Knockout Bracket** button (enabled once all 42 group matches are completed).
  Knockout results cascade automatically: the QF winner fills Semi Final 2, and both semi
  winners fill the Final.
- **Live scores (`/live`)** — public, no login, realtime, one row per court.
- **Leaderboard (`/leaderboard`)** — public standings (Wins → Diff → Points For), updates
  instantly as matches complete.
- **Knockout (`/knockout`)** — public bracket view of SF1 / QF / SF2 / Final.

Every score change is written straight to Supabase and pushed to all connected screens via
Supabase Realtime, typically well under a second.

## 6. Deploy to Vercel

```bash
npm i -g vercel   # if you don't already have it
vercel
```

When prompted, link/create the project, then set the same three environment variables
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
under **Project Settings → Environment Variables** in the Vercel dashboard (or via
`vercel env add`). Then:

```bash
vercel --prod
```

That's it — the deployed URL is immediately usable by all three referees and the admin.

## Project structure

```
app/
  page.tsx                 Home
  login/page.tsx            Login
  court/[courtId]/          Referee screen (per court)
  dashboard/                 Admin dashboard
  live/                       Public live scores
  leaderboard/                Public standings
  knockout/                   Public bracket
  api/login, api/logout       Session cookie endpoints
  api/matches/[id]             Score/start/finish/undo/reset/setWinner actions
  api/knockout/generate         Computes standings, populates the bracket
lib/                          Supabase clients, auth, standings calc, realtime hook, sound
data/users.json                Hardcoded users
supabase/schema.sql             Table + RLS + realtime setup
supabase/seed.sql               Teams + fixtures seed data
```
