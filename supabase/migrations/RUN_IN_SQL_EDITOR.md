# Run migrations in Supabase Dashboard

If you're not using the Supabase CLI, run each migration in order in the **SQL Editor**:

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. Click **New query**.
3. Paste the contents of the migration file (e.g. `008_allow_app_period_start_all_cadences.sql`).
4. Click **Run**.

Run only migrations that haven't been applied yet (e.g. 007 then 008 if 007 isn't applied).
