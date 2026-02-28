# Deploying Challenge Tracker to a Public Server

The easiest way to go live is **Vercel** (free tier, one-click Next.js deploys). Follow the steps below.

---

## 1. Push your code to GitHub

If you haven’t already:

```bash
cd /Users/leoli/challenge-app
git init
git add .
git commit -m "Initial commit"
```

Create a new repository on [github.com](https://github.com/new), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

---

## 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (GitHub is easiest).
2. Click **Add New…** → **Project**.
3. Import your GitHub repo (`YOUR_USERNAME/YOUR_REPO`).
4. **Configure Project:**
   - **Framework Preset:** Next.js (auto-detected).
   - **Root Directory:** leave as `.` (or set to `challenge-app` if the repo root is the parent folder).
   - **Build Command:** `npm run build` (default).
   - **Output Directory:** leave default.
5. **Environment Variables** – add these (same as your local `.env.local`):

   | Name                         | Value                    |
   | ---------------------------- | ------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`   | Your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key    |

   Get both from Supabase: **Project Settings** → **API** (Project URL and anon public key).

6. Click **Deploy**. Wait for the build to finish.

7. Your app will be at a URL like `https://your-project.vercel.app`. Open it and test sign-up/sign-in.

---

## 3. Configure Supabase for your live URL

So that auth redirects work on the deployed app:

1. In [Supabase Dashboard](https://supabase.com/dashboard), open your project.
2. Go to **Authentication** → **URL Configuration**.
3. Set:
   - **Site URL:** your Vercel URL, e.g. `https://your-project.vercel.app`
   - **Redirect URLs:** add the same URL (and with trailing slash if you use it), e.g.:
     - `https://your-project.vercel.app`
     - `https://your-project.vercel.app/**`
4. Save.

After this, sign-in and sign-up should redirect correctly on the live site.

---

## 4. Optional: custom domain on Vercel

1. In Vercel, open your project → **Settings** → **Domains**.
2. Add your domain (e.g. `challenges.yourdomain.com`) and follow the DNS instructions.
3. In Supabase **URL Configuration**, set **Site URL** and **Redirect URLs** to your custom domain as well.

---

## Other hosting options

- **Netlify:** Import the same GitHub repo, set build command `npm run build`, publish directory `.next` (or use the Next.js runtime they suggest), and add the same two env vars.
- **Railway / Render / Fly.io:** Create a new project from the repo, set build to `npm run build` and start to `npm run start`, and add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the dashboard.

Your Supabase database and auth are already in the cloud; you only need to deploy the Next.js app and point Supabase to your public app URL.
