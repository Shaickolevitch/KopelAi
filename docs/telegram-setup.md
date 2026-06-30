# Telegram bot setup

KopelAi can talk over Telegram as a second messaging doorway (same memory, tier,
daily wall, and brain as the website). The code is already in `backend/src/index.ts`
and stays inert until `TELEGRAM_BOT_TOKEN` is set.

## 1. Create the bot (BotFather) — already done

In Telegram, talk to **@BotFather** → `/newbot` → pick a name and a username
(must end in `bot`, e.g. `KopelAiBot`). BotFather gives you a **token** like
`123456789:AA...`. Keep it secret.

Optional polish in BotFather:
- `/setdescription`, `/setabouttext`, `/setuserpic` — how the bot looks.
- Privacy mode doesn't matter for 1:1 chats (only affects groups).

## 2. Set env vars on Railway (backend service)

| Variable | Value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | the BotFather token |
| `TELEGRAM_BOT_USERNAME` | the bot's username **without** `@` (e.g. `KopelAiBot`) — used for the `t.me` deep link |
| `TELEGRAM_LIVE` | `1` to show "Connect Telegram" to everyone (admin always sees it) |
| `TELEGRAM_WEBHOOK_SECRET` | any random string (recommended) — verifies updates really came from Telegram |

Redeploy so the backend picks them up.

## 3. Register the webhook (one-time)

Point Telegram at the backend's `/telegram/webhook`. Run this once (replace the
token and secret):

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://kopelai-backend-production.up.railway.app/telegram/webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

Check it took:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

You should see your URL with `pending_update_count` and no `last_error_message`.

## 4. How a user connects

1. On the site: **Plan → "Connect Telegram"** → they get a code + an "Open
   Telegram" button (a `t.me/<bot>?start=KOPEL…` deep link).
2. Tapping it opens the bot; pressing **Start** sends `/start KOPEL…`, which the
   webhook redeems and links that Telegram chat to their account.
3. From then on they just message the bot — same memory and plan as the website.
   (They can also paste the bare code into the chat if they didn't use the link.)

Codes are valid 30 minutes, one active code per user. Connecting also drops a
one-time +5 water reward on their tree (`onceKey: 'telegram'`).

## Notes

- Idle Telegram threads (>30 min) auto-close and consolidate into memory/insights,
  same as WhatsApp.
- Replies are kept short and text-like (the prompt's `# Telegram` directive).
- To take it offline: unset `TELEGRAM_BOT_TOKEN` (the routes/sweeper go inert) or
  call `deleteWebhook`.
