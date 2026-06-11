# KopelAi on WhatsApp — Plan (for review, not yet built)

_Prepared June 2026. Read this, then tell me go / no-go / change-it._

---

## The idea in one line

Let people talk to Kopel as a normal WhatsApp contact — and have it be the **same Kopel** they use on the website: same memory, same plan, same relationship. Two doorways into one brain.

---

## The one big decision: yes, sync them

I recommend the WhatsApp agent is **not a separate product** — it's a second entrance to the system you already have. The website's backend stays the single "brain"; WhatsApp is just another way in.

Why:

- **Memory is the whole point.** Kopel "remembering you over time" is your paid feature and your I‑Thou idea. If WhatsApp and web each had their own separate memory, Kopel would forget you every time you switched — which breaks the promise.
- **Otherwise free users escape the wall.** If WhatsApp were separate, someone could hit the 25/day limit on the website and just keep going free on WhatsApp. Sharing one account closes that loophole.
- **The two modes complement each other.** The website is for the deep, sit-down "session." WhatsApp is for the quick thought between sessions ("Kopel, something just came up with a client…"). Same relationship, different moment.

**The only tricky part:** the website knows you by email/Google; WhatsApp knows you by phone number. So we need a one-time **"connect your WhatsApp"** step that links your phone to your account (you tap a button on the site, it opens WhatsApp with a code, the code links them). After that, every WhatsApp message is recognized as you.

---

## How it works (a day in the life)

1. On the website, Shai-the-user taps **"Connect WhatsApp."** It opens a chat to Kopel's number with a prefilled code. He sends it. Done — phone now linked to his account.
2. Later that week he messages Kopel on WhatsApp: *"had a hard session today."*
3. Kopel's number receives it → our server recognizes the phone → loads **the same memory and plan** as the website → replies in Kopel's voice, remembering past context.
4. After the back-and-forth goes quiet for a while, the system quietly **updates his memory and insights** — the same ones he sees on the website's Analysis page.
5. If he's a free user and sends too many messages in a day, he hits the **same daily wall** as on the web.

In short: WhatsApp message comes in → we look up who it is → run the exact same Kopel logic you already have → send the reply back through WhatsApp.

---

## What actually gets built

Plain list of the pieces:

1. **A WhatsApp number + business account.** A dedicated phone number for Kopel (can't be a number already used in normal WhatsApp), connected to Meta's WhatsApp Business platform.
2. **A "messages webhook."** A small new service that receives incoming WhatsApp messages and sends replies. This is the only genuinely new backend piece.
3. **Account linking.** A "Connect WhatsApp" button on the site + a tiny table that maps `phone number → user account`.
4. **Reuse everything else.** The chat logic, memory, insights, knowledge base, daily wall, trial/Pro rules — all reused as-is, just keyed to the same account.
5. **(Later) Reminders.** Optional gentle proactive nudges ("it's been a week — want to reflect?"), which WhatsApp only allows via pre-approved message templates and only to people who opted in (your signup consent checkbox already captures that opt-in).

---

## How "remembering" works

The memory already lives in your database, tied to the account — not to a device or channel. So the moment a phone is linked, Kopel on WhatsApp **already knows you** from your website history, and vice versa. Nothing separate.

The one real difference: on the website, memory gets updated when you press **"end session."** WhatsApp has no "end" button — it's a rolling chat. So we consolidate memory on a **trigger instead**:

- **Best option:** after ~30–60 minutes of silence, treat that burst of messages as a "session" and run the same memory + insights update you already run on the web.
- **Backup option:** once a night, fold the day's WhatsApp messages into the memory.

Within an active chat, it behaves exactly like the web: it carries the recent messages as live context and injects your long-term memory summary.

**Tiers carry over cleanly:** long-term memory on WhatsApp is a **Pro/trial** feature, just like on web. Free users get the rolling short-term context within a day plus the shared daily wall, but Kopel doesn't permanently remember them day-to-day. Identical model, no special cases.

---

## Privacy & WhatsApp's rules (important)

- **Your "private & encrypted" wording needs a tweak.** WhatsApp messages are encrypted between the user and WhatsApp, but our server still processes them (same as the website) — and they pass through Meta. We should update the privacy policy and add a clear consent line at the moment someone links their WhatsApp.
- **You can't message people whenever you want.** WhatsApp only lets you reply freely **within 24 hours** of the user's last message (this is free). Anything proactive outside that window — reminders, nudges — must use a **pre-approved template** and the person must have opted in. That's why reminders are a later phase, not day one.

---

## Which provider to use

Three ways to connect to WhatsApp:

| Option | Cost | Best for | Notes |
|---|---|---|---|
| **Meta Cloud API (direct)** ✅ recommended to start | No platform fee; you only pay Meta's per-message fees (and most of our messages are free — see below) | Builders who'll write their own logic (that's us) | Cheapest; you already build everything yourself |
| **360dialog** | ~$49/mo + Meta fees at zero markup | Privacy-focused, EU hosting | Strong GDPR/privacy posture; worth revisiting if privacy framing matters to your audience |
| **Twilio** | Meta fees + ~$0.005/message | Fastest to wire up | Convenient but adds a markup on every message |

**Recommendation:** start on the **Meta Cloud API directly** — no monthly fee, and since people *message Kopel first*, almost all your messages are free "service" replies. Revisit 360dialog later only if you want their EU-hosted privacy story.

---

## What it costs

- **WhatsApp messaging:** essentially **free** for the core use. When a user messages Kopel and Kopel replies within 24 hours, those replies cost nothing. You'd only pay for **proactive reminders** (roughly a few agorot each), and only once you turn that feature on.
- **AI:** the same cost you already model on the web — about **₪0.10 per message** (prompt caching already in place). WhatsApp doesn't add to this.
- **Voice notes (nice bonus):** you already have voice transcription built for the web — Kopel could understand WhatsApp voice notes too, at the small transcription cost you already pay.

So: WhatsApp barely adds cost. The spend is the same AI you already budgeted, plus tiny template fees if/when you add reminders.

---

## Suggested rollout (phased — stop after any phase)

- **Phase 0 — Setup (mostly your side, I guide):** get a dedicated number, create the WhatsApp Business account, connect Meta Cloud API. _No code from me yet._
- **Phase 1 — MVP:** the webhook + account linking + "Connect WhatsApp" button. Linked users chat with Kopel on WhatsApp using their real account, plan, and memory. Free users get the shared daily wall. _This is the core build._
- **Phase 2 — WhatsApp memory:** idle/nightly memory + insights consolidation for WhatsApp threads.
- **Phase 3 — Reminders:** opt-in proactive nudges via approved templates (e.g., a gentle weekly "want to reflect?").
- **Phase 4 — Polish:** voice notes, a smoother first-time WhatsApp onboarding, and WhatsApp added as a channel in your new analytics dashboard.

You can ship Phase 1 and stop there — it's already a complete, valuable product.

---

## What I'd need from you to execute

1. **A dedicated phone number** for Kopel on WhatsApp (not your personal number, and not a number already active in regular WhatsApp).
2. **A Meta Business account** + WhatsApp Business API access (I'll walk you through the setup; some steps only you can click).
3. **One decision:** should WhatsApp work **only for people who linked an account** (cleaner, protects the memory/billing model — my recommendation), or also allow **phone-only strangers** to chat as anonymous-free (wider reach, but messier)?
4. **OK to update the privacy policy** and add a WhatsApp consent line.

---

## Honest risks / things to weigh

- **It's a real build, not a toggle** — a new always-on service (the webhook), plus Meta's approval process for the business number and (later) message templates, which can take days and occasionally needs back-and-forth with Meta.
- **WhatsApp is Meta's platform** — they set the rules and can change pricing or policy. You're a tenant.
- **Tone shift** — WhatsApp invites shorter, more frequent messages than the reflective web "session." Kopel's prompt may need a lighter, more conversational variant for WhatsApp so it doesn't feel like a wall of text.
- **Support surface grows** — people will expect fast replies on WhatsApp the way they do from a person.

---

## My recommendation

**Do it, synced, starting with Phase 1 on the Meta Cloud API — and hold reminders for later.** It directly amplifies your core promise (a Kopel that knows you and is always reachable), it adds almost no running cost, and it reuses ~90% of what you've already built. The main investment is the one new webhook service and the account-linking step.

If you want to proceed, the first move is Phase 0 (the number + Meta account). Tell me and I'll give you an exact, click-by-click setup checklist and then build Phase 1.
