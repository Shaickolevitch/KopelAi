# Taking KopelAi online — guide

Right now KopelAi runs only on your Mac. To put it on the internet you deploy two
things: the **website** (to Vercel) and the **backend/brain** (to Railway), then
point them at each other and flip a few settings. Go in order. Keep your env
values from `.env.local` and `backend/.env` nearby.

There are **two values** you'll reuse:
- KopelAi Supabase URL: `https://yxioeeuzhdknhpbjjzgq.supabase.co`
- The two callback addresses you'll update once you have a real web address.

---

## Part 0 — Put the code on GitHub (once)

Vercel and Railway deploy from GitHub.

1. Create a free account at **github.com** if you don't have one.
2. Create a **new private repository** called `kopelai`.
3. In Terminal:
   ```
   cd ~/Documents/Claude/Projects/KopelAi
   git init && git add -A && git commit -m "KopelAi"
   git branch -M main
   git remote add origin https://github.com/<your-username>/kopelai.git
   git push -u origin main
   ```
   (`.env` files are git-ignored, so your secrets are NOT uploaded — good.)

---

## Part 1 — Deploy the backend (Railway)

1. Go to **railway.app**, sign in with GitHub, **New Project → Deploy from GitHub repo → kopelai**.
2. In the service settings, set **Root Directory** to `backend`.
3. Set **Start Command** to `npm run start` (build command can stay default / `npm install`).
4. Open **Variables** and add (copy the values from your `backend/.env`):
   - `ANTHROPIC_API_KEY`
   - `OPENAI_API_KEY`
   - `SUPABASE_URL` = `https://yxioeeuzhdknhpbjjzgq.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - (Don't set PORT — Railway provides it automatically.)
5. Deploy. When it's live, copy the public URL (looks like `https://kopelai-backend-production.up.railway.app`). Call this your **BACKEND URL**.

---

## Part 2 — Deploy the website (Vercel)

1. Go to **vercel.com**, sign in with GitHub, **Add New → Project → import kopelai**.
2. Framework auto-detects Next.js. Leave the root as the repo root.
3. Add **Environment Variables** (from your `.env.local`, plus the backend URL):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://yxioeeuzhdknhpbjjzgq.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL` = your **BACKEND URL** from Part 1
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CHING_SECRET_KEY`
   - `CHING_WEBHOOK_SECRET`
4. Deploy. Copy the live web address (e.g. `https://kopelai.vercel.app`). Call this your **WEB URL**.

---

## Part 3 — Tell Supabase the real web address

In the Supabase dashboard → **kopelai** → Authentication → **URL Configuration**:
- **Site URL** = your **WEB URL**
- **Redirect URLs** → add `https://<your WEB URL>/auth/callback`

---

## Part 4 — Make Google login public

1. Google Cloud Console → your KopelAi OAuth project → **Audience / OAuth consent screen** → **Publish app** (moves it out of "testing" so any user can sign in, not just test users).
2. No redirect change needed — Google still points at the Supabase callback you set earlier.

---

## Part 5 — Turn on real payments (Ching)

1. In the **Ching** dashboard, go live (approved live keys) and put your **live** `CHING_SECRET_KEY` into Vercel (Part 2) — redeploy after changing env.
2. Add a **webhook endpoint** in Ching pointing to:
   `https://<your WEB URL>/api/webhooks/ching`
   Copy its signing secret into Vercel as `CHING_WEBHOOK_SECRET`.
3. Confirm **tax invoicing (חשבונית מס)** is enabled in Ching for Israeli customers.

This is what makes the upgrade → become-Pro flow complete (the webhook can now reach your live site, which localhost couldn't).

---

## Part 6 — Email that actually sends

New Supabase projects use a basic shared email sender with tight limits. For real
signups, in Supabase → Authentication → **Emails / SMTP**, connect a sender like
**Resend** (free tier is fine) so confirmation and reset emails arrive reliably.
(Users who sign in with Google skip email entirely.)

---

## Part 7 — Your own domain (optional but recommended)

1. Buy a domain (e.g. `kopelai.com` / `.co.il`).
2. In Vercel → your project → **Domains** → add it and follow the DNS steps.
3. Then update, using the new domain:
   - Supabase **Site URL** + **Redirect URLs** (`https://yourdomain/auth/callback`)
   - The Ching **webhook** URL
   - (Google needs no change.)

---

## Final checks before sharing the link
- Sign up with a brand-new email → confirmation email arrives → you can log in.
- Sign in with Google works for a non-test account.
- Send a chat message → you get a reply (backend reachable).
- Upgrade with a real card (or Ching test mode) → you become Pro shortly after (webhook).
- Cancel → you stay Pro to period end.
- The Lectures page is still a placeholder — fine, or hide that tab when you're ready.

Paste me any error from any step and I'll get you through it.
