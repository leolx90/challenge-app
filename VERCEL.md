# Step-by-Step: Deploy Challenge Tracker on Vercel

Do this after your code is on GitHub (see [GITHUB.md](GITHUB.md) if you haven’t pushed yet).

---

## Step 1: Open Vercel and sign in with GitHub

1. Go to **[vercel.com](https://vercel.com)** in your browser.
2. Click **Sign Up** (or **Log In** if you already have an account).
3. Choose **Continue with GitHub**.
4. If asked, authorize Vercel to access your GitHub account (click **Authorize**).
5. You’ll land on the Vercel dashboard (e.g. “Add New…” or a list of projects).

---

## Step 2: Start importing your project

1. Click **Add New…** (top right).
2. Click **Project**.
3. You’ll see “Import Git Repository” and a list of your GitHub repos.
4. Find **challenge-app** (or whatever you named the repo).
5. Click **Import** next to it.

---

## Step 3: Configure the project (leave most as default)

You’ll see “Configure Project” with these fields:

| Field | What to do |
| ----- | ---------- |
| **Project Name** | Leave as `challenge-app` (or change if you want). This becomes part of your URL: `challenge-app.vercel.app`. |
| **Framework Preset** | Should say **Next.js**. Don’t change it. |
| **Root Directory** | Leave **empty** (or `.`). Only change if your Next.js app is inside a subfolder of the repo. |
| **Build and Output Settings** | Leave as default (**Build Command:** `npm run build`, **Output Directory:** empty). |

Do **not** click **Deploy** yet. Add environment variables first.

---

## Step 4: Add environment variables

1. On the same “Configure Project” page, find the section **Environment Variables**.
2. You need to add **two** variables (same as in your local `.env.local`).

**Where to get the values:**

- Open **[Supabase Dashboard](https://supabase.com/dashboard)** and select your project.
- Go to **Project Settings** (gear icon in the left sidebar).
- Click **API** in the left menu.
- You’ll see:
  - **Project URL** → use this for `NEXT_PUBLIC_SUPABASE_URL`
  - **Project API keys** → **anon** **public** → use this for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Add the first variable:**

1. Under **Key**, type: `NEXT_PUBLIC_SUPABASE_URL`
2. Under **Value**, paste your Supabase **Project URL** (e.g. `https://xxxxx.supabase.co`).
3. Leave **Environment** as **Production** (or check Production, Preview, and Development if you want).
4. Click **Add** or the **Add** button next to the row.

**Add the second variable:**

1. **Key:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. **Value:** paste your Supabase **anon public** key (long string starting with `eyJ...`).
3. Click **Add**.

You should see both variables listed. Double-check for typos in the key names.

---

## Step 5: Deploy

1. Click the **Deploy** button at the bottom of the page.
2. Vercel will clone your repo and run `npm run build`.
3. You’ll see a build log (e.g. “Building…”, “Installing dependencies…”). Wait until it finishes (usually 1–2 minutes).
4. When the build succeeds, you’ll see **“Congratulations!”** or a **Visit** link.

---

## Step 6: Get your live URL

1. After deploy finishes, click **Visit** (or open your project in the Vercel dashboard).
2. Your app’s URL will look like: **`https://challenge-app-xxxx.vercel.app`** (or `https://your-project-name.vercel.app`).
3. Copy this URL (you need it for Supabase in the next step).
4. Open the URL in a new tab. You should see your app (sign-in/sign-up page). Don’t worry if sign-in redirects feel wrong at first—we fix that in Step 7.

---

## Step 7: Configure Supabase so sign-in works on the live site

So that “Sign in” and “Sign up” redirect back to your Vercel URL (and not localhost):

1. In the **Supabase Dashboard**, open your project.
2. Go to **Authentication** in the left sidebar.
3. Click **URL Configuration**.
4. Set:
   - **Site URL:** paste your Vercel URL, e.g. `https://challenge-app-xxxx.vercel.app` (no trailing slash is fine).
   - **Redirect URLs:** in the text box, add these (one per line or comma-separated, depending on the UI):
     - `https://challenge-app-xxxx.vercel.app`
     - `https://challenge-app-xxxx.vercel.app/**`
     - `https://challenge-app-xxxx.vercel.app/auth/callback`
     - `https://challenge-app-xxxx.vercel.app/auth/callback/**`
     Use your real Vercel URL instead of `challenge-app-xxxx`. The `/auth/callback` entries are needed for “Forgot password” reset links.
5. Click **Save**.

Now try **Sign up** or **Sign in** on your live Vercel URL again. After logging in, you should land back on your app (e.g. home or onboarding).

---

## Step 8: Test the app

On your live Vercel URL, try:

1. Sign up with a new email (or sign in).
2. Set your display name on the onboarding screen (if shown).
3. Open the home page, create a challenge, open a challenge detail, use “Invite” and “Check in.”

If anything fails, check the browser console (F12 → Console) and Vercel’s **Deployments** → latest deployment → **Building** / **Functions** logs for errors.

---

## Summary checklist

- [ ] Code is on GitHub.
- [ ] Signed in to Vercel with GitHub.
- [ ] Imported the repo as a new Project.
- [ ] Added `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel.
- [ ] Clicked Deploy and waited for success.
- [ ] Copied the live Vercel URL.
- [ ] In Supabase: set **Site URL** and **Redirect URLs** to that Vercel URL.
- [ ] Tested sign-in/sign-up and main flows on the live URL.

---

## Updating the live app later

Whenever you push new code to the **main** branch on GitHub:

1. Vercel will automatically start a new deployment (you’ll see it under **Deployments** in your project).
2. When the build finishes, the live URL will serve the new version. No need to click “Redeploy” unless you only changed environment variables (then use **Settings** → **Environment Variables** and **Redeploy** for the latest deployment).

That’s it. Your Challenge Tracker is live on a public URL.
