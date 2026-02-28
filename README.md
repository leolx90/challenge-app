# Challenge Tracker

A web app for creating and tracking challenges with check-ins and payouts. Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, and Supabase.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Supabase**

   - Create a project at [supabase.com](https://supabase.com).
   - In the SQL Editor, run the migrations in order:
     - `supabase/migrations/001_schema.sql`
     - `supabase/migrations/002_profiles.sql`
     - `supabase/migrations/003_profiles_username.sql`
     - `supabase/migrations/004_check_ins_guard.sql`
   - In Authentication → Providers, enable Email and optionally disable "Confirm email" for local testing.
   - In Project Settings → API, copy the project URL and the `anon` public key.

3. **Environment**

   Copy `.env.local.example` to `.env.local` and set:

   - `NEXT_PUBLIC_SUPABASE_URL` – your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` – your Supabase anon key

4. **Run the app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Sign up or sign in, then create a challenge and invite others via the invite link.

## Push to GitHub (first time)

If you’re new to Git/GitHub, see **[GITHUB.md](GITHUB.md)** for step-by-step instructions to push this project to GitHub.

## Deploy to a public server

- **Vercel (recommended):** See **[VERCEL.md](VERCEL.md)** for a full step-by-step Vercel deployment guide.
- **Other hosts:** See **[DEPLOY.md](DEPLOY.md)** for a short overview (Vercel, Netlify, Railway, etc.).

## Features

- Sign up / sign in with email and password
- Create challenges with name, check-in cadence (day / week / two weeks / month), start date, length, and amount per participant
- View open and completed challenges on the home page
- Challenge detail: check in (once per cadence period), invite (copy link), view participants and check-ins, delete (creator only)
- Invite link: sign in if needed, then view challenge and join (disabled if the challenge has already started)
- Completed challenges: payout per participant = (their check-ins / total check-ins) × total committed amount
