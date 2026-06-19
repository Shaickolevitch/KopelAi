# Pre-Publish Checkup — KopelAi

**Date:** 2026-06-14
**Recommendation:** Ship after a few quick fixes — no blockers found
**Blockers:** 0   **High:** 2 (both now fixed ✅)   **Medium:** 4   **Low:** 5

> **Update 2026-06-14:** Both High items resolved — Next bumped to 16.2.9 (RSC
> advisory cleared), backend `npm audit fix` → 0 vulnerabilities, and Open
> Graph / Twitter / `og:image` link-preview metadata added. Committed (not yet
> pushed). Remaining Medium/Low items below are unaddressed.

## Summary

KopelAi is in good shape to go public. The security fundamentals that matter most
for an app holding sensitive therapist reflections and taking payments are all
solid: Row Level Security is enabled on every table with correctly-scoped
policies, the service-role key never reaches the browser, every admin endpoint is
gated server-side against a verified JWT, the payment webhook is cryptographically
verified, and paid endpoints are rate-limited. **No blockers.** The two things
worth doing before you advertise: (1) bump dependencies to clear a high-severity
Next.js advisory and a couple of backend ones, and (2) add Open Graph / link-preview
tags — because your whole referral feature is link-sharing, and right now a shared
`kopelai.com` link renders with no preview image.

## 🚫 Blockers — fix before going public

None found — genuinely. The high-stakes checks (RLS, secrets, admin authz,
payment webhook) all passed.

## ⚠️ High — strongly recommended before launch

1. **Known-vulnerable dependencies** — `package.json` (frontend + backend)
   - **Issue:** `npm audit` reports 1 high + 1 moderate on the frontend (Next.js
     RSC cache-poisoning / proxy-bypass advisories, plus a postcss XSS), and 2
     high + 3 moderate on the backend (incl. `ws` uninitialized-memory disclosure).
   - **Impact:** Known CVEs in request-handling libraries are among the most common
     ways public apps get probed on day one. (Note: the Next.js *middleware*-bypass
     advisories are largely N/A — you have no `middleware.ts` — but the RSC
     cache-poisoning one applies to the App Router.)
   - **Fix:** Frontend — bump Next to `16.2.9` (`npm i next@16.2.9`, then verify the
     build). Backend — `cd backend && npm audit fix` (non-breaking per the advisory).

2. **No Open Graph / link-preview metadata** — `app/layout.tsx`
   - **Issue:** Only `title` and `description` are set. There are no `openGraph`,
     `twitter:card`, or `og:image` tags anywhere, and no `metadataBase`.
   - **Impact:** You just built a referral program whose entire mechanic is people
     sharing `kopelai.com/?ref=…` on WhatsApp and social. With no `og:image`, those
     shares render as a bare link with no preview — which measurably lowers
     click-through on exactly the growth channel you're about to lean on.
   - **Fix:** Add an `openGraph` block to the root `metadata` (set `metadataBase`,
     `og:title`, `og:description`, and a ~1200×630 `og:image` at an absolute URL),
     plus `twitter:card: 'summary_large_image'`. A single shared OG image for the
     site is enough to start.

## 🔸 Medium — fix soon

- **Wildcard CORS on the API** — `backend/src/index.ts:34` uses `app.use(cors())`
  (allow-all origins). Mitigated because the API authenticates via Bearer tokens,
  not cookies (so CSRF isn't really possible), but best practice is to restrict to
  your production frontend origin. Fix: `cors({ origin: ['https://kopelai.com', ...] })`.
- **Supabase: leaked-password protection disabled** — Auth advisor flags that
  HaveIBeenPwned checking is off. One toggle in Auth settings blocks users from
  signing up with known-compromised passwords.
- **No `robots.txt` / `sitemap.xml`** — not noindexed (good, nothing is blocked),
  but adding `app/sitemap.ts` + `app/robots.ts` helps discoverability for a public
  launch. Low-effort SEO.
- **73 ESLint errors** — mostly `@typescript-eslint/no-explicit-any` in
  `backend/src/index.ts` (style, not bugs; Next 16 doesn't lint on build so they
  don't block deploys). One worth a look: `react-hooks/set-state-in-effect` in
  `lib/i18n.tsx:25` — a real (minor) cascading-render smell.

## 🔹 Low / polish

- **Verbose DB errors returned to client** — `app/api/ching/checkout/route.ts:43,61`
  return `profileErr.message` / `upsertErr.message` in the JSON response. Minor
  internal info disclosure; log server-side and return a generic message instead.
- **Sentry DSN + PostHog key hardcoded as fallbacks** —
  `instrumentation-client.ts:5`, `app/providers.tsx:20`. These are *publishable*
  ingest keys (safe to ship to the browser by design), so not a leak — but moving
  them to env vars makes rotation cleaner.
- **`vector` extension in `public` schema** — Supabase advisor WARN; cosmetic,
  move to a dedicated schema when convenient.
- **In-memory rate limiter** — `backend/src/index.ts:120` resets on restart and
  isn't shared across instances. Fine for a single Railway instance; revisit if you
  scale horizontally.
- **Perf advisor INFO** — one unindexed FK on `whatsapp_link_codes` (tiny table)
  and a few unused indexes. Negligible at current scale.

## ✅ What's solid

- **Database access control (the big one):** RLS enabled on all 16 tables. Every
  client-facing policy scopes to `auth.uid() = user_id` (or `= id`) — no
  `using(true)`, no over-permissive writes. Tables touched only by the backend
  (`referrals`, `daily_usage`, `admin_events`, `kb_*`, `whatsapp_*`, `feedback`,
  `reviews`) are RLS-on with no policy = deny-all to the anon key. Correct by design.
- **Secrets:** none committed; `.env*` gitignored; the service-role key is used only
  server-side (backend + Next API routes). Every `NEXT_PUBLIC_*` var is genuinely
  public (anon key, URL, PostHog/Sentry publishable keys).
- **Admin authorization:** every `/admin/*` endpoint verifies the JWT via
  `supabaseAdmin.auth.getUser(token)` then checks `user.id === ADMIN_USER_ID` —
  real server-side gating, not UI hiding. The admin page also redirects non-admins
  client-side (defense in depth). A non-admin hitting `/app/admin` directly sees no
  data (all endpoints 403).
- **Payments:** Ching webhook verified with HMAC-SHA256 + timing-safe compare;
  checkout/cancel scope to the user's own `ching_customer_id`.
- **Abuse protection:** per-user rate limits on chat (40/min), transcribe (20/min),
  file upload (20/min), feedback (10/min), end-session (20/min), reviews (5/min) —
  plus the daily message wall.
- **Type safety:** frontend and backend both `tsc --noEmit` clean.
- **Observability:** Sentry (client + server + edge), PostHog (EU), and Vercel
  Analytics/Speed Insights all wired up.

## Checks performed

| Phase | Check | Status | How verified |
|---|---|---|---|
| 0 | Scope / stack | ✅ | Read package.json, configs, tree |
| 1 | TypeScript (frontend) | ✅ pass | Ran `tsc --noEmit` |
| 1 | TypeScript (backend) | ✅ pass | Ran `tsc --noEmit` |
| 1 | Production build | ⚠️ not run | Blocked in sandbox (no Google Fonts network); typecheck clean + live Vercel deploys build fine |
| 1 | ESLint | ⚠️ 73 errors | Ran `eslint .` — mostly `any` in backend, non-blocking |
| 1 | Dependency audit | ⚠️ issues | Ran `npm audit` (fe + be) — see High #1 |
| 1 | Secrets in source | ✅ clean | Grep for secret patterns |
| 3 | Auth (JWT verified server-side) | ✅ | Code review of backend auth helper |
| 3 | Authorization / admin gating | ✅ | Code review — server-side on all `/admin/*` |
| 3 | Service-role key client exposure | ✅ none | Grep + client init review |
| 3 | XSS / injection | ✅ | Only static `dangerouslySetInnerHTML` (theme init), parameterized queries |
| 3 | CORS / headers | ⚠️ wildcard CORS | Code review — see Medium |
| 3 | Webhook signature | ✅ | Code review — HMAC-SHA256 timing-safe |
| 3 | Rate limiting | ✅ | Code review — all paid endpoints |
| 4 | RLS enabled all tables | ✅ | Live Supabase MCP — list_tables |
| 4 | Policy scoping | ✅ | Live query of `pg_policies` |
| 4 | Security advisor | ⚠️ INFO/WARN | Live `get_advisors` — no blockers |
| 4 | Performance advisor | ✅ INFO only | Live `get_advisors` |
| 5 | SEO / OG tags | ⚠️ missing OG | Code review — see High #2 |
| 5 | Metadata / favicon | ✅ | title/description set, K icon present |
| 5 | Observability | ✅ | Sentry + PostHog + Vercel wired |
| 2 | Manual QA | ◑ code review | Reviewed flows by reading components/routes — not live browser-tested |

---

*Manual QA (Phase 2) was done by code review, not live browser testing, since the
app sits behind auth + deploy. If you want, I can drive the real signup → chat →
checkout → admin flows in a browser for a higher-confidence pass.*
