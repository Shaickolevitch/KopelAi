# KopelAi — Pricing Strategy & Recommended Module

_Research-backed pricing recommendation. Prepared June 2026. Israel-first (₪/ILS), primary buyer: therapists; secondary: coaches and trainees._

---

## TL;DR — the recommended module

Three tiers + an annual toggle + a verified student rate. All prices **VAT-inclusive** (Israel VAT = 18% in 2026), round shekel amounts (no `.99` — Israel abolished it).

| Tier | Monthly | Annual (2 months free) | Who | What they get |
|---|---|---|---|---|
| **חינמי / Free** | ₪0 | — | Try Kopel | Conversation with KopelAi, **25 messages/day** (the daily wall). No cross-session memory, no insights. |
| **פרו / Pro** ⭐ *Most popular* | **₪99** | **₪990** | Individual therapists & coaches | Unlimited conversation, cross-session memory, personal insights, end-of-session analysis. |
| **מנטור / Pro+** | **₪179** | **₪1,790** | Power users, supervisors, coaches | Everything in Pro + exportable reflection/supervision summaries (bring to your own הדרכה), priority new features, deepest-model analysis. |
| **סטודנט / Student** | **₪39** | ₪390 | Students & interns (.ac.il or license-in-training) | Full Pro features, verified. Acquisition tier, not a profit line. |

**The single most important number stays ₪99/month** — it anchors beautifully against the real price of one therapy session (~₪350–400) and sits *above* admin-only clinic software (₪75–99), justified because Kopel delivers clinical/reflective value, not scheduling.

**Headline anchor (honest):** _"₪99 לחודש — פחות משליש ממחיר מפגש אחד."_ ("Less than a third of one session.") Do **not** use a fabricated ₪350 strike-through (see §2).

---

## 1. The exchange-rate correction (good news)

Your prior model assumed **USD→ILS ≈ 3.7**. The verified June 2026 rate is **~2.97** (2026 average ~3.06). The shekel is materially stronger, so **every dollar of AI cost is ~20% cheaper in shekels than your spreadsheet assumed.** All figures below use **2.97**.

## 2. Drop the fake strike-through (legal + trust)

The current pricing shows ₪350 / ₪3,500 crossed out as the "regular" price. Best practice **and law** say only strike a price you actually charged:

- The **EU Omnibus Directive** (in force since 2023, and the standard Israeli consumer-protection regulators align toward) requires a displayed "before" price to be the **lowest price in the prior 30 days**. A reference price you never charged is treated as deceptive.
- Israel has a strong posture against misleading pricing and already legislated `.99` endings out of existence.

**Replace it with one of:**
- **Comparison anchor (recommended):** "₪99/חודש — פחות משליש ממחיר מפגש אחד" (honest, powerful, uses the real ~₪350 session price).
- **Genuine early-bird:** "מחיר השקה ₪99 · המחיר הקבוע יעלה ל-₪149" — only if you truly intend to raise it later.

---

## 3. AI cost basis (what a user actually costs you)

Claude Sonnet 4.5 (your chat model): **$3 / 1M input**, **$15 / 1M output** (verified, unchanged in 2026). Embeddings and voice transcription are negligible by comparison.

- **Per user message** (~10k input incl. system + RAG + history, ~600 output): **$0.039 ≈ ₪0.12**
- **End-of-session analysis bundle** (memory + insights, ~3 calls): **$0.12 ≈ ₪0.35/session**

**Monthly cost per usage profile (ILS, conservative, no caching):**

| Profile | Msgs/mo | Sessions | **Cost/mo** |
|---|---|---|---|
| Light | 150 | 5 | **≈ ₪19** |
| Moderate | 400 | 10 | **≈ ₪50** |
| Heavy (Pro power user) | 1,000 | 12 | **≈ ₪120** |

**Two cost levers you should turn on (both reduce the tail risk):**
1. **Prompt caching** the static system prompt + RAG context (~2,500 tokens). Cache reads cost 10% of input → cuts ~20–30% off per-message cost. Easy win.
2. **Route the async end-of-session analysis through the Batch API** (50% off) and/or **Haiku 4.5** ($1/$5 — one-third the price). Analysis isn't real-time, so quality tradeoff is low.

---

## 4. Tier economics (with VAT)

If you bill as an Israeli עוסק, the ₪99 a customer sees is **VAT-inclusive**, so your net is ₪99 ÷ 1.18 = **₪83.9**. API costs are pre-VAT (USD). Net margins:

| Tier (net of VAT) | Typical user cost | Margin | Note |
|---|---|---|---|
| Pro ₪99 → net ₪83.9 | Light ₪19 | **~77%** | Most early users |
| Pro ₪99 → net ₪83.9 | Moderate ₪50 | **~40%** | Healthy |
| Pro ₪99 → net ₪83.9 | Heavy ₪120 | **loss (-₪36)** | Rare; mitigate ↓ |
| Pro+ ₪179 → net ₪151.7 | ₪50–70 | **~55–67%** | Strong |
| Student ₪39 → net ₪33 | ₪19–50 | thin/breakeven | Intentional funnel |

**The heavy-Pro loss is real but rare.** Mitigate with: (a) prompt caching (above), and (b) an optional **Pro fair-use soft cap of ~50 messages/day** — double the free wall, which genuine reflective use almost never reaches, but which caps abuse. Blended across a realistic user mix, Pro margin lands comfortably in the **50–65%** range.

**Free-tier cost is bounded** by the 25/day wall you just shipped: worst case ~₪29/mo, realistically a few shekels (most free users are sporadic). Treat it as customer-acquisition cost.

---

## 5. Free vs. trial — and the gap to fix

Best-practice data favors **free trials over open-ended freemium** for a solo founder (freemium converts only ~2.6% of free users and you pay to serve the other 97%). But your free tier is already a **metered freemium** (hard 25/day wall), which avoids the costly "unlimited free" trap. Keep it.

**The real problem:** your free tier deliberately hides the two things people actually pay for — **memory and insights**. So free users never *feel* the paid magic, which suppresses conversion.

**Fix (high impact):** let free users taste the paid value once.
- **Option A (recommended):** a **14-day full-Pro trial**, no credit card — therapists are a considered, trust-sensitive purchase; no-card maximizes qualified signups. Later A/B test a card-required variant (can 3–4× conversion).
- **Option B (lighter):** "**your first session analysis is free**" — after their first real conversation, show one full insights report, then lock it. Cheap, and it demonstrates the exact differentiator.

Either way: **push annual hard** at the standard ~17% ("חודשיים חינם"). Annual subscribers retain ~92% vs ~68% monthly, and you collect a full year of cash up front — the cash-flow engine for a solo founder.

---

## 6. Adjacent markets you're missing

Ranked by size × willingness-to-pay × fit:

1. **Coaches (מאמנים) — target this.** ~2,000–2,500 active in Israel. Their certification *requires* ~24 supervision sessions; their entire culture is reflective dialogue, goal tracking, and self-development, and they have a pay-for-edge mindset. Best-fit adjacent buyer. Reach them via the Coaching Chamber (לשכת המאמנים) and the ~20 coaching schools (Yozmot, Goma Gevim). Same ₪99/₪179 pricing works — just add coach-facing language ("self-supervision + client-insight tracking between sessions").
2. **Students & interns (psychology/social-work) — cheap acquisition tier.** Low budgets now, but they're in the *mandated supervised-practice* phase (maximal fit) and convert to full price as they enter the 44,000-strong social-work + 14,000 psychologist market. The ₪39 student tier is a pipeline play, not revenue.
3. **Hold for later (B2B/institutional):** social workers (44k, but supervision is employer-funded) and school counselors (~3,500, sell via שפ"י). Different sales motion — revisit once you have org features.
4. **Skip for now:** mediators, OD/HR consultants, clergy, generic journaling consumers (crowded, low ARPU).

---

## 7. What to change (rollout checklist)

- [ ] **Keep** Pro at ₪99/mo, ₪990/yr (already in `lib/ching.ts`).
- [ ] **Remove** the ₪350/₪3,500 strike-through; replace with the "less than a third of a session" anchor (landing page + plan picker + `i18n-strings.ts`).
- [ ] **Add** the **מנטור / Pro+** tier (₪179/₪1,790) — new Ching price IDs + a third plan card. Real upsell content: exportable supervision summaries, priority features, deepest-model analysis.
- [ ] **Add** the **סטודנט / Student** tier (₪39/₪390) with .ac.il / training-license verification.
- [ ] **Add** a value-taste: 14-day Pro trial **or** "first analysis free."
- [ ] **Turn on** prompt caching (system + RAG) in the backend `/chat` call.
- [ ] **Route** end-of-session analysis through Batch API and/or Haiku 4.5.
- [ ] **Optional:** Pro fair-use soft cap ~50/day to cap the cost tail.
- [ ] Ensure all consumer prices are shown **VAT-inclusive** with "כולל מע"מ".

---

## Sources

**AI costs:** Anthropic pricing (platform.claude.com/docs/en/about-claude/pricing); OpenAI embeddings/transcribe docs; USD/ILS (investing.com).
**Israeli therapist economics:** Bar-Ilan / Hebrew U / TAU psychotherapy program pages (supervision ₪250–300/hr); hebpsy.net, soulpsy.co.il (session ₪350–600); tipulog.co.il, my-cliniq.com (clinic SaaS ₪75–99); Ministry of Health 2023 workforce report (~14,300 psychologists); Taub Center 2024 (~44,000 social workers).
**Comparable apps:** Rosebud, Mindsera, Reflectly, Day One, Wysa, Pi, Calm, Headspace, BetterHelp, Upheal, Mentalyc, Blueprint, Eleos (official pricing pages, 2026).
**Pricing best practice:** GrowthSpree 2026 trial benchmarks; First Page Sage (freemium ~2.6%); Recurly / Subscription Index (annual retention & discount norms); Kalungi (tiering); EU Omnibus / Haaretz (.99 abolition); VATupdate (Israel VAT 18% 2026).
**Adjacent markets:** Israeli Coaching Chamber (ilcc.org.il), TheMarker (coach inactivity ~80%); Taub Center (social workers); שפ"י (educational counselors); psychology.org.il (internship).
