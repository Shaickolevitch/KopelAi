# KopelAi — Project Plan

A Hebrew-first conversational self-reflection **SaaS** for therapists. KopelAi is to therapists what Zotani is to the general user: a conversation that knows you, remembers you over time, and surfaces themes and insights. The difference is the audience and the purpose — KopelAi is a private space for the therapist's *own* reflection, supervision-style processing, and burnout prevention, not a clinical tool for managing clients.

KopelAi is a **web-based subscription product**, not a mobile app. It lives in the browser, works on desktop and mobile web (responsive), and is sold as a recurring subscription. No App Store / Google Play involvement.

## Vision

Therapists spend their days holding other people's emotional load and rarely have a structured, private place to process their own. KopelAi gives them an ongoing conversation that helps them reflect on hard sessions, notice their own patterns (countertransference, compassion fatigue, recurring frustrations), and track their professional and emotional state over time. It is reflective and supportive — explicitly **not** therapy, clinical advice, or a substitute for professional supervision.

Tagline direction (Hebrew, to refine): something in the spirit of Zotani's "שיחה שמכירה אותך" but oriented to the practitioner — e.g. "מרחב לעבד את מה שאתה נושא."

## Target user

Israeli-market therapists and mental-health practitioners: psychologists, social workers, psychotherapists, counselors, expressive-arts therapists, and students in training. Hebrew-native UX is a first-class concern, exactly as in Zotani. Secondary audience over time: supervisors and training programs.

## Core concept (the three pillars, adapted)

- **שיחה (Conversation)** — a warm, reflective conversational partner the therapist talks to after sessions or whenever they need to process. Prompts are oriented to professional reflection rather than general self-knowledge.
- **זיכרון (Memory)** — KopelAi remembers the therapist's recurring themes, named patterns, and emotional trends across conversations, so each session builds on the last.
- **תובנות (Insights)** — over time it surfaces patterns: which kinds of cases drain them, where countertransference shows up, early signs of burnout, what restores them.

## What makes KopelAi different from Zotani (not just a reskin)

1. **Clinical sensitivity & confidentiality by design.** Therapists will inevitably reference clients. KopelAi must actively steer toward *the therapist's experience* and away from storing client-identifying detail. Onboarding and in-conversation guardrails should encourage de-identified reflection ("a client who…", not names). This is the single most important design constraint.
2. **Reflection-oriented prompt design.** The conversational system prompt and starter prompts target professional reflection, supervision-style questions, and burnout signals — not generic self-discovery.
3. **Not-therapy / not-advice positioning.** Clear, repeated framing that KopelAi supports reflection and does not provide clinical advice, diagnosis, or supervision. Include crisis-resource signposting if the therapist themselves is in distress.
4. **Professional-life domain model.** Themes/insights are tuned to therapist concerns (caseload, specific modalities, difficult dynamics, professional growth, work-life boundaries).
5. **Trust & privacy as the product's core promise.** For this audience, "private and safe" is the value proposition, not a footnote. This shapes data handling, encryption posture, and marketing copy.

## Technical approach (web SaaS, reusing Zotani's proven pieces)

Reuse the parts of Zotani's stack that apply to a web product and drop the mobile-app layer entirely:

- **Web app**: Next.js 14 — the whole product, responsive for desktop and mobile browsers. No Expo / React Native, no native builds.
- **Backend**: Node.js / Express (Railway), or Next.js API routes / server actions if you prefer to keep it in one codebase.
- **Data & auth**: Supabase.
- **Billing**: subscription billing layer (e.g. Stripe, or an Israeli-market processor) with a free tier + paid plan. This replaces Zotani's in-app-purchase / external-link approach.
- **Deployment**: Vercel (web), Railway (backend if separate).

A single Next.js codebase (web + API routes + Stripe webhooks) is likely simpler than a monorepo for a solo SaaS; keep a monorepo only if you expect to share packages later. The conversational layer, memory extraction, and insight generation follow the same architecture Zotani uses, with KopelAi-specific system prompts, starter prompts, and theme taxonomy.

### Suggested data model (Supabase, first pass)

- `users` — auth + profile (role/specialty optional, locale).
- `conversations` — per-session reflective conversations.
- `messages` — conversation turns.
- `memories` — extracted long-term facts/patterns about the therapist (never about identifiable clients).
- `insights` — surfaced themes/trends with timestamps.
- `themes` — KopelAi-specific taxonomy (burnout, countertransference, boundaries, professional growth, etc.).
- `subscriptions` — plan/status synced from the billing provider (Stripe customer + subscription IDs, current tier, period end).

Hard-delete / "reset account" must delete user data in FK-safe order while preserving auth — reuse the lesson learned on Zotani.

## Subscription model

A SaaS needs a clear plan structure. Starting point to refine:

- **Free trial / limited tier** — let therapists experience the conversation before paying (e.g. limited conversations or a time-boxed trial).
- **Paid plan(s)** — monthly and/or annual recurring subscription for full access (unlimited conversations, memory, insights).
- **Possible B2B angle later** — seats for training programs, clinics, or supervisor groups.

Billing via Stripe (Stripe Checkout + customer portal + webhooks to sync subscription state into Supabase) is the fastest path; confirm whether an Israeli-market processor or invoicing (חשבונית מס) is needed for local customers.

## Key risks & open questions

- **Confidentiality framing**: needs review for professional-ethics expectations in the Israeli context; consider input from a practicing therapist.
- **Liability positioning**: explicit terms that KopelAi is a reflection tool, not clinical supervision or therapy.
- **Billing & local tax**: Stripe vs Israeli processor; VAT / invoicing requirements for Israeli customers.
- **Pricing**: what therapists will pay monthly; trial length and limits that convert without giving everything away.
- **Acquisition**: how therapists discover it (professional networks, associations, content), since there's no app-store surface.

## Proposed milestones

1. **Foundation** — set up the Next.js 14 project here; Supabase project, auth, and the data model above.
2. **Conversation MVP** — KopelAi-specific system prompt + Hebrew starter prompts; basic conversation persistence.
3. **Memory & insights** — adapt extraction and insight surfacing to the therapist theme taxonomy.
4. **Confidentiality guardrails** — onboarding, in-conversation de-identification nudges, not-therapy framing, crisis resources.
5. **Billing** — Stripe Checkout, customer portal, webhooks → `subscriptions`; gate full access behind an active plan; trial logic.
6. **Landing page & launch** — Hebrew marketing home page with tagline, feature sections, pricing, and signup CTA (mirror Zotani's home page, plus pricing).

## Next steps in this workspace

This document is the starting point. When you're ready, the natural next move is to scaffold the Next.js 14 project here, or to draft the KopelAi conversational system prompt and Hebrew starter prompts first.
