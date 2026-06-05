# KopelAi — Product Specification (v1, from founder Q&A)

Source of truth for what we're building, captured from Shai's answers. Supersedes assumptions in the project plan where they conflict.

## What it is

A Hebrew-first (English later) web SaaS that is a private reflective conversation partner for therapists — to help each therapist better understand **their own strengths and weaknesses** as a practitioner. Built for therapists who use psychology in their methods, with a special lean toward **psychoanalysis / neuro-analysis (נוירואנליזה)**. Strictly personal reflection, never clinical supervision or client management.

## Core goals

- Primary user outcome: a therapist gains a clearer understanding of their strengths and weaknesses.
- Business goal: grow users and revenue.
- First distribution channel: Shai's college / a Facebook group of ~1,500 therapists. These therapists don't currently use any tool like this.

## The user

- All kinds of therapists who use psychology, especially psychoanalytic / neuro-analytic methods.
- Across career stages: early-career, mid, and veteran.
- **Technophobic and not tech-comfortable** — the UX must be extremely simple and reassuring. This is a hard design constraint.
- Hebrew speakers first; English added later.
- They open KopelAi in two modes: "curiosity mode" and "heavy feelings/thoughts mode" (e.g. after a hard session).
- Setting: primarily **private practice / private clinic**.
- No single flagship use case to optimize first — Shai doesn't have a strong preference (both "after a hard session" and "weekly/daily reflection" matter equally).
- Real beta testers are available.

## The conversation (the heart)

- Posture: **listen, reflect, and challenge.** Very directive.
- Persona: a **wise, warm, sharp supervisor** — very human, very knowledgeable, warm but sharp and unapologetic.
- Lens: **psychoanalysis.**
- Text-only responses. The user can **upload recordings, images, PDFs, and docs**, and the AI understands them (audio transcription + document/image understanding feeding the conversation).
- **Guided flow that emerges from open chat:** at the start of every conversation the AI leads — "What do you want to talk about? How was your last session? What's bothering you most?" — then opens into free conversation.
- Proactive: KopelAi initiates ("how was today?") rather than only waiting.
- Typical session length: 10–15 minutes.
- Memory/patterns: when KopelAi notices a pattern across time, it may raise it mid-conversation.

## Memory & analysis

- Long-term memory of the user is a **paid feature.** In the free tier there is **no memory over time** — each conversation is standalone, one chat at a time.
- **Trigger mechanic:** in the Chat page there is an **"End session & analyze"** button. Pressing it analyzes everything said in that conversation, presents the result on the **Analysis** page, and **restarts the chat** (fresh session). So analysis is per-session and user-triggered, not continuous.
- The Analysis page shows both **narrative text and visual trends**, and (for paid users) tracks change over time across sessions.
- Analysis **categories are reused from Zotani's Insights page** (captured live below).
- Memory is not user-editable (no memory-management UI required).

## Confidentiality & safety

- Client-related content **is stored** (no aggressive minimization required by the founder).
- De-identification: the AI should **gently nudge** the therapist not to use real client names, but does not block.
- User conversations are **never** used to improve the product.
- No explicit "not therapy" gating screen required, and no specific professional-ethics standard to align to — but positioning remains personal reflection, not therapy/supervision.
- Crisis handling: the AI should behave as the underlying model (Claude/GPT/Gemini) is designed to in distress situations — no custom crisis flow required.

## Pages (fixed set — no others, e.g. no settings page)

1. **Homepage** — presents Shai, "Kopel" (the psychologist the product is named after), and the app.
2. **Chat** — the reflective conversation, with file upload.
3. **Recordings store** — browse and buy recordings across different subjects; **77 lectures** in the catalog.
4. **Manage plan** — subscription management.
5. **Analysis** — automatic insights, narrative + visual, over time.
6. **Admin dashboard** (Shai only) — edit the AI system prompt, and upload files (all kinds of psychological data) that the agent reads and understands (knowledge base the AI draws on).

## Analysis categories (reused from Zotani's Insights page)

Captured live from zotani.app on 2026-06-04. The Analysis page in Zotani shows a stats header — שיחות (# conversations), הודעות (# messages), פעילות אחרונה (last activity) — then a short narrative summary, then one card per category. KopelAi reuses this same structure, with the AI's analysis reframed for a therapist reflecting on their own practice. When a category has no data yet, Zotani shows a placeholder ("זוטאני עוד לומד אותך כאן" / "still learning about you here").

The 17 categories:

1. ערכים — Values
2. אמונות — Beliefs
3. חוזקות — Strengths
4. מיומנויות רכות — Soft skills
5. מיומנויות קשות — Hard skills
6. דפוסים — Patterns
7. נושאים חוזרים — Recurring themes
8. איך אתה מקבל החלטות — How you make decisions
9. מה מרוקן אותך — What drains you
10. מקורות אנרגיה — Sources of energy
11. תחביבים — Hobbies
12. פחדים — Fears
13. חלומות — Dreams
14. הייעוד שלך — Your purpose / calling
15. איפה תוכל לפרוח — Where you can flourish
16. ניסיון ורקע — Experience & background
17. מה [המערכת] עדיין לומדת עליך — What the app is still learning about you

Note: a few of these (hobbies, dreams, sources of energy) are general self-knowledge categories; for KopelAi we may keep them as-is or lightly retune toward professional reflection later. Shai wants them reused for now.

## Recordings store

- A catalog of **77 lectures** organized by subject.
- Therapists can buy recordings (separate from the reflection subscription — a content store).
- Implies media hosting/streaming, per-item purchase, and access control for purchased content.

## Admin dashboard (Shai)

- Live-edit the conversational system prompt.
- Upload psychological reference material (PDF/doc/etc.) that becomes a knowledge base the AI retrieves from and reasons over (retrieval-augmented generation).

## Pricing & business model

- **Free forever** tier — unlimited use, but **no long-term memory** (single standalone chats).
- **Paid** tier — like Zotani's pricing; unlocks long-term memory and analysis over time.
- **Annual discount:** pay for 10 months, get 12.
- B2C only.
- **Israeli invoicing (חשבונית מס) / VAT is a must-have at launch.**

## Brand & language

- Name comes from **"Kopel,"** the psychologist Shai works with.
- Tone: very human, very knowledgeable, warm but sharp and unapologetic.
- Hebrew + English at launch.
- Look & feel reference: Zotani (zotani.app).

## Tech & delivery

- Built solo with AI assistance, same as Zotani.
- **Reuse Zotani's codebase/components** as the starting point.
- Web SaaS (Next.js / Supabase / Stripe per the project plan).
- Target timeline: **weeks.**

## Open questions still to resolve

- **Custom themes** — deferred. Fixed categories for everyone for now; user-defined themes may be added later.
- Whether "Kopel" the person should be featured/credited and how.

## Resolved defaults (revisit if needed)

- **Data residency:** Shai unsure of legal requirement. Default to an **EU region** for the database/storage as a conservative choice for Israeli therapist data; revisit if a specific requirement surfaces.
- **Flagship use case:** no preference — build for both "after a hard session" and "weekly/daily reflection."
