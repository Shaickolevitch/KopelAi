# KopelAi — Build Roadmap (v2)

Updated after the founder Q&A. Reflects the real scope: six fixed surfaces (homepage, chat, recordings store, manage plan, analysis, admin), an admin knowledge base the AI reads from, user file uploads the AI understands, memory gated to the paid tier, and Israeli invoicing at launch. See `KopelAi-product-spec.md` for the source of truth.

Ordering rules: (1) infra + live deploy first, (2) data/auth/security foundation next, (3) prove the conversation end-to-end, (4) layer on the differentiators (memory, analysis, knowledge base, file understanding), (5) commerce + billing, (6) marketing + launch. Items marked **(parallel)** can run alongside their phase. The technophobic audience means **simplicity and reassurance are acceptance criteria on every screen**, not a phase.

---

## Phase 0 — Decisions & accounts

1. Lock tagline (Hebrew), brand basics, and how "Kopel" the person is presented/credited.
2. Buy domain + email sending domain.
3. Pick LLM provider/model; set a monthly cost ceiling.
4. Confirm architecture: single Next.js app + API routes, reusing Zotani's codebase as the base.
5. Lock pricing specifics (free-forever limits, paid price = Zotani's, annual = pay-10-get-12).
6. Create accounts: GitHub, Vercel, Supabase, Stripe (with Israeli invoicing/VAT path), LLM key, vector-store option, audio-transcription provider, file storage, Sentry, email provider.

## Phase 1 — Foundation & live deploy (fork from Zotani)

7. Fork/reuse Zotani's codebase; strip to KopelAi; confirm Next.js 14 + TypeScript + Tailwind, RTL/Hebrew default.
8. Set up env handling, shared config, and i18n scaffolding (Hebrew now, English-ready).
9. Wire Supabase (server + browser) and confirm connection.
10. Connect GitHub → Vercel; deploy a Hebrew placeholder to the real domain (DNS + SSL).
11. Base layout, design tokens, and shared RTL UI primitives — tuned for a non-technical, reassuring feel.

## Phase 2 — Data model & security

12. Migrate schema: `profiles`, `conversations`, `messages`, `memories`, `insights`, `subscriptions`, `lectures`, `purchases`, `kb_documents`, `kb_chunks` (knowledge base), `app_config` (editable system prompt).
13. Row-Level Security so every row is owner-scoped; admin-only access to `kb_*` and `app_config`.
14. Define the free vs paid distinction in data (free = no persisted long-term memory; paid = memory + analysis over time).
15. FK-safe hard-delete for account deletion (reuse Zotani lesson); account deletion lives inside Manage Plan (no settings page).

## Phase 3 — Auth & onboarding (extremely simple)

16. Supabase auth — favor the simplest path for technophobes (magic-link / minimal friction).
17. Hebrew, RTL auth screens; very plain language.
18. Protected routes, session handling, role flag for admin (Shai).
19. Create `profile` on signup; lightweight first-run welcome that presents Kopel/the app.

## Phase 4 — Conversation core (the heart)

20. Integrate the LLM with streaming.
21. Write the KopelAi **system prompt**: wise/warm/sharp psychoanalytic supervisor, very directive, listens-reflects-challenges, focused on the therapist's strengths and weaknesses. Loaded from `app_config` so admin can edit it live (Phase 8).
22. **Guided opening flow** that starts every conversation ("What do you want to talk about? How was your last session? What's bothering you most?") then opens into free chat.
23. Chat UI (streaming, RTL, warm Hebrew empty state); dead-simple for non-technical users.
24. Persist conversations/messages; reload on mount (avoid Zotani's tab state-loss bug).
25. **Proactive prompting** ("how was today?") — gentle, not nagging.
26. Free-tier behavior: standalone single chats with no long-term memory; clear, kind messaging about what upgrading unlocks.

## Phase 5 — File understanding (user uploads)

27. Upload UI for audio/recordings, images, PDF, doc into a conversation.
28. Audio → transcription pipeline; PDF/doc parsing; image understanding — all feeding the conversation context.
29. Storage + access control for uploaded files; size/cost guardrails.

## Phase 6 — Memory & analysis (paid differentiators)

30. Memory extraction (paid): durable facts about the therapist persisted to `memories`.
31. Memory retrieval/injection so sessions build on each other; surface a noticed pattern mid-conversation when relevant.
32. **"End session & analyze" button** in Chat: analyzes the whole conversation, writes results to the Analysis page, and restarts the chat (fresh session).
32b. **Analysis page**: insights from each analyzed session — narrative text **and** visual trends — using Zotani's analysis categories; for paid users, tracks change over time across sessions.
33. Gating so free users see the value of Analysis but it's a paid unlock.

## Phase 7 — Admin dashboard & knowledge base (Shai only)

34. Admin-only dashboard route (role-gated).
35. **Live system-prompt editor** writing to `app_config`; conversation reads the current prompt.
36. **File upload → knowledge base:** ingest psychological material (PDF/doc/etc.), chunk + embed into `kb_chunks` (vector store).
37. **Retrieval (RAG):** the conversation retrieves relevant knowledge-base chunks so the AI reasons over Shai's curated psychological data.
38. Admin view of what's ingested; remove/replace documents.

## Phase 8 — Recordings store (commerce)

39. `lectures` catalog (77 lectures) organized by subject; admin way to add/edit entries. **(parallel with earlier phases for data entry)**
40. Store page: browse by subject, lecture detail.
41. Media hosting + secure streaming/playback; protect against unauthorized access.
42. Per-item purchase via Stripe (one-time payments, separate from subscription).
43. Purchased-content access control (`purchases`) and a "my recordings" view within the store.

## Phase 9 — Subscription billing & manage plan

44. Stripe products/prices: paid plan (monthly + annual = pay-10-get-12).
45. Checkout + Stripe customer portal.
46. Webhooks → `subscriptions`; gate memory/analysis behind active plan.
47. **Manage Plan page**: plan status, upgrade/cancel, billing history, and account deletion.
48. **Israeli invoicing (חשבונית מס) / VAT** for both subscriptions and lecture purchases — required at launch (Stripe Tax or local invoicing integration). **(parallel, blocks charging local customers)**

## Phase 10 — Pre-launch hardening (much is parallel)

49. LLM + transcription cost/abuse controls: per-user rate limits, token caps.
50. Error monitoring (Sentry) + logging.
51. Transactional email: welcome, magic-link, subscription receipts, lecture purchase receipts.
52. Privacy policy + terms (personal-reflection positioning; Israeli privacy law). **(parallel)**
53. Privacy-respecting analytics for activation/conversion.
54. QA: full flows (signup → guided chat → upload file → upgrade → buy a lecture), RTL correctness, mobile-web, cross-browser — with a technophobe lens.
55. Performance pass: streaming latency, transcription turnaround, page load.

## Phase 11 — Homepage, launch & growth

56. **Homepage**: presents Shai, presents Kopel, presents the app; Hebrew, warm/human/sharp tone, signup CTA, and a window into the store. Look & feel referencing Zotani.
57. Basic SEO + OG metadata (Hebrew).
58. Private beta with therapists from the ~1,500-member Facebook group; gather feedback; fix top issues.
59. Public launch into the college / Facebook community; iterate.
60. English localization pass (post-Hebrew launch).

## Phase 12 — Post-launch (ongoing)

61. Monitor cost, errors, conversion; iterate on the system prompt, knowledge base, guided flow, and analysis.
62. Expand the lecture catalog and refine merchandising.

---

## Critical path (shortest line to value, then revenue)

0 → 1 → 2 → 3 → 4 then validate with a beta. Memory + Analysis (Phase 6), file understanding (Phase 5), and the knowledge base (Phase 7) are what make KopelAi special and should land before public launch. Billing (Phase 9) and the store (Phase 8) turn it into a business. RLS (Phase 2) and the technophobe-grade simplicity bar are non-negotiable throughout.

## Scope flags worth knowing

- The **recordings store** is effectively a second product (digital-goods commerce) bolted onto the SaaS — real work in media hosting, one-time payments, and access control.
- The **knowledge base + RAG** and **multimodal file understanding** (audio transcription especially) are the most technically involved pieces; budget time and cost for them.
- **Two payment types** (subscriptions + one-time lecture purchases), both needing Israeli invoicing, make billing heavier than a typical single-plan SaaS.
