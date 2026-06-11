# KopelAi on WhatsApp — your setup checklist (Phase 0)

The code is **built and deployed-inert**: it does nothing until the five `WHATSAPP_*`
environment variables below are set on the Railway backend. Once they're set, the
"Connect WhatsApp" card appears on the Plan page and the bot goes live.

Do these steps in order. Where it says **(you)** only you can do it; I can help with the rest.

---

## 1. Get a dedicated phone number **(you)**
- A number **not currently used in the normal WhatsApp app** (Meta requires this).
- A second SIM, an eSIM, or a virtual number that can receive an SMS/call code works.

## 2. Create the Meta pieces **(you, ~20 min)**
1. Go to **business.facebook.com** → make sure you have a Meta Business account.
2. Go to **developers.facebook.com** → **My Apps** → **Create App** → type **Business**.
3. In the app, **Add product → WhatsApp → Set up**.
4. Under **WhatsApp → API Setup**: add your phone number from step 1 (verify by SMS).
   - Copy the **Phone number ID** (a long number).
5. **App secret:** App → **Settings → Basic → App Secret** (click *Show*). Copy it.
6. **Permanent access token:** Business Settings → **System Users** → create one (Admin) →
   **Generate token** for your app with scopes **`whatsapp_business_messaging`** and
   **`whatsapp_business_management`**. Copy it. (The token shown on the API Setup page is
   temporary — use a System User token so it doesn't expire.)

## 3. Pick a verify token **(you — just invent a string)**
Any random secret, e.g. `kopelai-wa-7h3Qpz`. You'll paste the same value in two places (env + Meta webhook).

## 4. Set the env vars on Railway **(you)**
In your Railway backend service → **Variables**, add:

| Variable | Value |
|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | the Phone number ID from step 2.4 |
| `WHATSAPP_ACCESS_TOKEN` | the permanent System User token from step 2.6 |
| `WHATSAPP_APP_SECRET` | the App Secret from step 2.5 |
| `WHATSAPP_VERIFY_TOKEN` | the string you invented in step 3 |
| `WHATSAPP_NUMBER` | the WhatsApp number in digits only, e.g. `9725XXXXXXXX` (for the "open WhatsApp" link) |

Redeploy the backend after saving.

## 5. Register the webhook **(you, in Meta)**
- In the app → **WhatsApp → Configuration → Webhook → Edit**:
  - **Callback URL:** `https://<your-railway-backend-domain>/whatsapp/webhook`
  - **Verify token:** the same string from step 3.
  - Click **Verify and save** (our server answers the challenge automatically).
- Then **Manage** webhook fields → subscribe to **`messages`**.

## 6. Test recipients / go live **(you)**
- While the number is in **test mode**, Meta only delivers to phone numbers you add under
  **API Setup → recipients**. Add your own phone to test.
- For the public, complete **Business Verification** in Business Settings (can take a day or two).

## 7. Privacy **(I'll draft, you approve)**
- Update the privacy policy to mention WhatsApp, and we already capture marketing consent at signup.
- The "Connect WhatsApp" step is the consent moment for using the channel.

---

## How to test once it's live
1. Hard-refresh kopelai.com, log in, go to **Plan** → you'll see a **"KopelAi on WhatsApp"** card.
2. Click **Connect WhatsApp** → it shows a code + an **Open WhatsApp** button.
3. Send the code to Kopel's number. You should get "connected" back.
4. Send a real message — Kopel replies in his voice, shorter/text-style.
5. As a Pro/trial user, after ~30 min of silence your WhatsApp chat is consolidated into the
   same memory + insights you see on the web. As a free user you share the 25/day wall.

## What's already built (so you know what the env vars switch on)
- Webhook (verify + receive, signature-checked), phone↔account linking via one-time code.
- The full Kopel brain over WhatsApp: shared memory, tiers, daily wall, WhatsApp-shorter tone.
- 30-min idle → the same "end session" memory/insights consolidation.
- "Connect WhatsApp" card on the Plan page (hidden until the env vars are set).

## Not in this phase (deliberately)
- Proactive reminders (need Meta-approved message templates + the opt-in) — a later phase.
- Voice notes (your transcription already exists; easy to add next).
