# Turning on "Sign in with Google" — easy guide

You'll do this in two websites: **Google Cloud** (to create a key pair), then **Supabase** (to paste that key pair in). Takes about 10 minutes. Go slow; there's no way to break anything.

Two values you'll paste along the way — keep this guide open so you can copy them:

- **Google redirect address (paste into Google):**
  `https://yxioeeuzhdknhpbjjzgq.supabase.co/auth/v1/callback`
- **App address (paste into Supabase):**
  `http://localhost:3001/auth/callback`

---

## Part 1 — Google Cloud (create the key pair)

1. Open **https://console.cloud.google.com** and sign in with your Google account.

2. **Pick or create a project.** At the very top, next to "Google Cloud," there's a project dropdown. Click it → **New Project** → Name it `KopelAi` → **Create**. Wait a few seconds, then click the dropdown again and select **KopelAi** so it's the active project.

3. In the search bar at the top, type **OAuth consent screen** and click the result (it may be called "Google Auth Platform").

4. If it asks you to **Get started / Configure**:
   - **App name:** `KopelAi`
   - **User support email:** your email
   - **Audience:** choose **External**
   - **Contact email:** your email
   - Tick the agreement box → **Create** (or **Save**).

5. Now find **Clients** in the left menu (under the same OAuth/Google Auth Platform section) → click **Create client**.
   - **Application type:** **Web application**
   - **Name:** `KopelAi Web`
   - Scroll to **Authorized redirect URIs** → **Add URI** → paste the **Google redirect address** from the top of this guide:
     `https://yxioeeuzhdknhpbjjzgq.supabase.co/auth/v1/callback`
   - Click **Create**.

6. A box pops up showing **Client ID** and **Client Secret**. Copy **both** somewhere safe for a minute (you'll paste them in Part 2). The secret looks like `GOCSPX-...`.

7. **Add yourself as a test user** (so you're allowed to log in while it's in testing): go back to the OAuth/Audience screen → find **Test users** → **Add users** → type your Gmail address → **Save**.

---

## Part 2 — Supabase (paste the key pair in)

8. Open **https://supabase.com/dashboard** → open the **kopelai** project.

9. Left menu → **Authentication** → **Sign In / Providers** (sometimes just "Providers").

10. Find **Google** in the list → click to expand → turn on **Enable Sign in with Google**.
    - **Client ID (or "Client IDs"):** paste the Client ID from step 6
    - **Client Secret:** paste the Client Secret from step 6
    - Click **Save**.

11. Still under **Authentication**, click **URL Configuration**.
    - Under **Redirect URLs** → **Add URL** → paste the **App address**:
      `http://localhost:3001/auth/callback`
    - (Optional) set **Site URL** to `http://localhost:3001`
    - **Save**.

---

## Part 3 — Try it

12. Go to **http://localhost:3001/auth/signin** (use the same incognito window if your normal one still has the cookie issue).

13. Click **המשך עם Google / Continue with Google** → pick your Google account → you should land inside KopelAi, signed in.

---

### If something doesn't work
- **"Access blocked / app not verified"** → you didn't add yourself as a test user (step 7), or used a different Google account. Add the exact email you're logging in with.
- **"redirect_uri_mismatch"** → the Google redirect address in step 5 has a typo. It must be exactly `https://yxioeeuzhdknhpbjjzgq.supabase.co/auth/v1/callback`.
- **Lands back on the sign-in page** → the App address (step 11) is missing or mistyped in Supabase Redirect URLs.

Paste me any error you see and I'll tell you the fix.
