import 'dotenv/config';
import './instrument'; // Sentry init — must come before other imports
import * as Sentry from '@sentry/node';
import crypto from 'crypto';
import express, { Request, Response } from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import multer from 'multer';
import { Readable } from 'stream';
import { supabaseAdmin } from './supabase';
import { KOPELAI_SYSTEM_PROMPT } from './prompts/kopelai';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';

const EMBEDDING_MODEL = 'text-embedding-3-small'; // 1536 dims

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

app.use(cors());
// Capture the raw body so we can verify WhatsApp webhook signatures.
app.use(express.json({ limit: '1mb', verify: (req, _res, buf) => { (req as any).rawBody = buf; } }));

// ----------------------------------------------------------
// Insight categories — keep in sync with the frontend
// ----------------------------------------------------------
const INSIGHT_CATEGORIES = [
  { key: 'values', he: 'ערכים', en: 'Values' },
  { key: 'beliefs', he: 'אמונות', en: 'Beliefs' },
  { key: 'strengths', he: 'חוזקות', en: 'Strengths' },
  { key: 'soft_skills', he: 'מיומנויות רכות', en: 'Soft skills' },
  { key: 'hard_skills', he: 'מיומנויות קשות', en: 'Hard skills' },
  { key: 'patterns', he: 'דפוסים', en: 'Patterns' },
  { key: 'recurring_themes', he: 'נושאים חוזרים', en: 'Recurring themes' },
  { key: 'decision_making', he: 'איך אתה מקבל החלטות', en: 'How you make decisions' },
  { key: 'drains', he: 'מה מרוקן אותך', en: 'What drains you' },
  { key: 'fuel_fillers', he: 'מקורות אנרגיה', en: 'Fuel fillers' },
  { key: 'hobbies', he: 'תחביבים', en: 'Hobbies' },
  { key: 'fears', he: 'פחדים', en: 'Fears' },
  { key: 'dreams', he: 'חלומות', en: 'Dreams' },
  { key: 'calling', he: 'הייעוד שלך', en: 'Calling' },
  { key: 'thriving_contexts', he: 'איפה תוכל לפרוח', en: 'Where you might thrive' },
  { key: 'experience', he: 'ניסיון ורקע', en: 'Experience & background' },
  { key: 'open_questions', he: 'מה קופלAI עדיין לומד עליך', en: 'Open questions' },
];

// ----------------------------------------------------------
// Health check
// ----------------------------------------------------------
app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'kopelai-api' });
});

// ----------------------------------------------------------
// Admin: live system prompt (edited from the Admin dashboard)
// TODO: replace ADMIN_USER_ID with a proper role check + verified JWT.
// ----------------------------------------------------------
const ADMIN_USER_ID = '12d3baa7-d3b8-4809-bba9-6919e1607368';

// ── Auth: verify the Supabase access token (never trust a user id from the body) ──
async function getAuthedUser(req: Request) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

// How many messages a free user may send per Israel-calendar day before the
// hard wall. Tuned to land just past the first upgrade nudge (16), while the
// user is invested but the urge to continue is strongest. Change this one
// number to adjust the wall; the daily_usage counter and UI follow it.
const FREE_DAILY_MESSAGE_LIMIT = 25;
// Trial users keep Pro features (memory, insights) but are metered at a higher
// daily cap to bound cost during the 14-day trial. Paid Pro is uncapped.
const TRIAL_DAILY_MESSAGE_LIMIT = 50;

// Opt-in 14-day Pro trial: users start free and explicitly activate the trial,
// which stamps user_profile.trial_ends_at. The clock is that timestamp (not
// signup), it's set once, and it's never cleared — so a trial can't be
// restarted. Trial users get Pro features (memory, insights) but are metered
// at the higher daily cap.
const PRO_TRIAL_DAYS = 14;
function trialActiveFrom(trialEndsAt: string | null | undefined): boolean {
  if (!trialEndsAt) return false;
  return Date.now() < new Date(trialEndsAt).getTime();
}
function trialDaysLeftFrom(trialEndsAt: string | null | undefined): number {
  if (!trialActiveFrom(trialEndsAt)) return 0;
  const msLeft = new Date(trialEndsAt as string).getTime() - Date.now();
  return Math.max(0, Math.ceil(msLeft / 86_400_000));
}

// Referral program: a referee gets a 30-day trial; a referrer earns this many
// comped-Pro days (full, uncapped Pro) each time a referee converts to paying.
const REFERRAL_TRIAL_DAYS = 30;
const REFERRAL_REWARD_DAYS = 30;
function compedProActive(referralProUntil: string | null | undefined): boolean {
  if (!referralProUntil) return false;
  return Date.now() < new Date(referralProUntil).getTime();
}

// ── Simple per-user fixed-window rate limiter (in-memory) ──
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = rateBuckets.get(key);
  if (!b || now > b.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  b.count += 1;
  return b.count > limit;
}

app.get('/system-prompt', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user || user.id !== ADMIN_USER_ID) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const prompt = await getBasePrompt();
    res.json({ prompt });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

app.post('/system-prompt', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user || user.id !== ADMIN_USER_ID) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const { prompt } = req.body;
    if (typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'prompt is required' });
    }
    const { error } = await supabaseAdmin
      .from('app_config')
      .upsert(
        { key: 'system_prompt', value: prompt, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    if (error) throw error;
    res.json({ status: 'ok' });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// ----------------------------------------------------------
// Admin: knowledge base (upload → chunk → embed → store; list; delete)
// ----------------------------------------------------------
app.post('/admin/kb/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user || user.id !== ADMIN_USER_ID) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // multer/busboy decodes the multipart filename header as latin1, which mangles
    // UTF-8 names (e.g. Hebrew). Re-decode to get the real filename.
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

    const text = await extractText(req.file.buffer, originalName);
    const chunks = chunkText(text);
    if (chunks.length === 0) {
      return res.status(400).json({ error: 'No readable text found in the file.' });
    }

    const embeddings = await embedTexts(chunks);

    const { data: doc, error: docErr } = await supabaseAdmin
      .from('kb_documents')
      .insert({
        filename: originalName,
        char_count: text.length,
        chunk_count: chunks.length,
        file_size: req.file.size,
      })
      .select('id')
      .single();
    if (docErr) throw docErr;

    const rows = chunks.map((content, i) => ({
      document_id: doc.id,
      content,
      embedding: JSON.stringify(embeddings[i]),
    }));
    const { error: chunkErr } = await supabaseAdmin.from('kb_chunks').insert(rows);
    if (chunkErr) throw chunkErr;

    res.json({ id: doc.id, filename: originalName, chunk_count: chunks.length });
  } catch (err: any) {
    console.error('KB upload error:', err);
    res.status(500).json({ error: err.message ?? 'Upload failed' });
  }
});

app.get('/admin/kb/documents', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user || user.id !== ADMIN_USER_ID) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const { data, error } = await supabaseAdmin
      .from('kb_documents')
      .select('id, filename, char_count, chunk_count, created_at, file_size')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ documents: data ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

app.post('/admin/kb/delete', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user || user.id !== ADMIN_USER_ID) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });
    const { error } = await supabaseAdmin.from('kb_documents').delete().eq('id', id);
    if (error) throw error;
    res.json({ status: 'ok' });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// ----------------------------------------------------------
// Admin: user management (list / change tier / delete)
// ----------------------------------------------------------
app.get('/admin/users', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user || user.id !== ADMIN_USER_ID) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const search = (req.query.search as string) || '';
    const tier = (req.query.tier as string) || 'all';
    const page = Math.max(0, parseInt((req.query.page as string) || '0', 10) || 0);
    const pageSize = 25;
    const ALLOWED_SORT = ['name', 'created_at', 'last_active', 'tier', 'conversations'];
    const sortBy = ALLOWED_SORT.includes(req.query.sortBy as string)
      ? (req.query.sortBy as string)
      : 'created_at';
    const sortDir = req.query.sortDir === 'asc' ? 'asc' : 'desc';
    const { data, error } = await supabaseAdmin.rpc('admin_list_users', {
      search,
      tier_filter: tier === 'free' || tier === 'pro' ? tier : 'all',
      lim: pageSize,
      off: page * pageSize,
      sort_by: sortBy,
      sort_dir: sortDir,
    });
    if (error) throw error;
    const rows = (data as any[]) ?? [];
    const total = rows.length > 0 ? Number(rows[0].total) : 0;
    res.json({
      users: rows.map((r) => ({
        id: r.id,
        email: r.email,
        created_at: r.created_at,
        tier: r.tier,
        deleted_at: r.deleted_at,
        last_active: r.last_active,
        marketing_consent: r.marketing_consent ?? false,
        conversations_count: Number(r.conversations_count ?? 0),
      })),
      total,
      page,
      pageSize,
    });
  } catch (err: any) {
    console.error('Admin list users error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// Monitoring summary for the admin dashboard: own-DB metrics + PostHog + Sentry.
// PostHog/Sentry light up only when their env keys are present; otherwise they
// return { configured: false } and the UI shows a "connect" hint.
async function getPosthogSummary() {
  const apiKey = process.env.POSTHOG_API_KEY; // secret — must be set in Railway
  const projectId = process.env.POSTHOG_PROJECT_ID || '197739';
  const host = process.env.POSTHOG_HOST || 'https://eu.posthog.com';
  if (!apiKey || !projectId) return { configured: false };
  try {
    const run = async (query: string) => {
      const r = await fetch(`${host}/api/projects/${projectId}/query/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
      });
      if (!r.ok) throw new Error(`PostHog ${r.status}`);
      const j = await r.json();
      return (j.results ?? []) as unknown[][];
    };
    const [eventRows, userRows, pvRows, pageRows] = await Promise.all([
      run("SELECT event, count() AS c FROM events WHERE timestamp > now() - INTERVAL 7 DAY GROUP BY event ORDER BY c DESC LIMIT 8"),
      run("SELECT count(DISTINCT person_id) AS c FROM events WHERE timestamp > now() - INTERVAL 7 DAY"),
      run("SELECT count() AS c FROM events WHERE event = '$pageview' AND timestamp > now() - INTERVAL 7 DAY"),
      run("SELECT properties.$pathname AS p, count() AS c FROM events WHERE event = '$pageview' AND timestamp > now() - INTERVAL 7 DAY GROUP BY p ORDER BY c DESC LIMIT 8"),
    ]);
    return {
      configured: true,
      activeUsers7d: Number(userRows?.[0]?.[0] ?? 0),
      pageviews7d: Number(pvRows?.[0]?.[0] ?? 0),
      events: eventRows.map((row) => ({ event: String(row[0]), count: Number(row[1]) })),
      topPages: pageRows.map((row) => ({ page: String(row[0] ?? '/'), count: Number(row[1]) })),
    };
  } catch (e) {
    return { configured: true, error: e instanceof Error ? e.message : 'PostHog fetch failed' };
  }
}

// The Sentry summary hits Sentry's external API (~600ms). It's read by the admin
// notification bell, which polls every 90s, so a live call per poll made the
// endpoint slow (Sentry flagged it as a "blocking operation"). Cache the result
// so repeated polls are served from memory: 5 min on success, 1 min on error
// (so a transient Sentry hiccup retries soon rather than sticking).
let _sentryCache: { at: number; ttl: number; data: unknown } | null = null;
const SENTRY_CACHE_OK_MS = 5 * 60 * 1000;
const SENTRY_CACHE_ERR_MS = 60 * 1000;

async function getSentrySummary() {
  if (_sentryCache && Date.now() - _sentryCache.at < _sentryCache.ttl) return _sentryCache.data;
  const token = process.env.SENTRY_AUTH_TOKEN; // secret — must be set in Railway
  const org = process.env.SENTRY_ORG || 'shaiyan';
  const project = process.env.SENTRY_PROJECT || 'kopelai';
  if (!token || !org || !project) {
    const data = { configured: false };
    _sentryCache = { at: Date.now(), ttl: SENTRY_CACHE_OK_MS, data };
    return data;
  }
  try {
    const r = await fetch(
      `https://sentry.io/api/0/projects/${org}/${project}/issues/?query=is:unresolved&statsPeriod=14d&limit=8`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!r.ok) throw new Error(`Sentry ${r.status}`);
    const issues = (await r.json()) as any[];
    const data = {
      configured: true,
      openIssues: issues.length,
      issues: issues.map((i) => ({
        title: i.title ?? i.metadata?.value ?? 'Issue',
        count: Number(i.count ?? 0),
        lastSeen: i.lastSeen ?? null,
        permalink: i.permalink ?? null,
      })),
    };
    _sentryCache = { at: Date.now(), ttl: SENTRY_CACHE_OK_MS, data };
    return data;
  } catch (e) {
    const data = { configured: true, error: e instanceof Error ? e.message : 'Sentry fetch failed' };
    _sentryCache = { at: Date.now(), ttl: SENTRY_CACHE_ERR_MS, data };
    return data;
  }
}

app.get('/admin/monitoring', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user || user.id !== ADMIN_USER_ID) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const [{ data: supa }, posthog, sentry] = await Promise.all([
      supabaseAdmin.rpc('admin_metrics'),
      getPosthogSummary(),
      getSentrySummary(),
    ]);
    res.json({ supabase: supa ?? null, posthog, sentry });
  } catch (err: any) {
    console.error('Admin monitoring error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// Rich analytics (growth, engagement, retention cohorts, funnel, revenue).
app.get('/admin/analytics', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user || user.id !== ADMIN_USER_ID) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const { data, error } = await supabaseAdmin.rpc('admin_analytics');
    if (error) throw error;
    res.json(data ?? {});
  } catch (err: any) {
    console.error('Admin analytics error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// Admin notifications: outstanding items needing attention. Counts clear
// themselves as the admin handles each (triage feedback, approve reviews,
// resolve Sentry issues).
app.get('/admin/notifications', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user || user.id !== ADMIN_USER_ID) return res.status(403).json({ error: 'Not authorized' });

    // Run all four lookups in parallel — the Sentry call is a slow external HTTP
    // request, so awaiting it after the DB counts (as before) serialized ~1.5s of
    // latency. Folding it into the same Promise.all collapses that to the slowest
    // single call. getSentrySummary() handles its own errors; .catch is a guard.
    const [fb, rv, pp, s] = await Promise.all([
      supabaseAdmin.from('feedback').select('*', { count: 'exact', head: true }).eq('status', 'new'),
      supabaseAdmin.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabaseAdmin.from('admin_events').select('*', { count: 'exact', head: true }).eq('type', 'pro_purchase').eq('seen', false),
      getSentrySummary().catch(() => null),
    ]);
    let sentry_open = 0;
    if (s && (s as any).configured && typeof (s as any).openIssues === 'number') sentry_open = (s as any).openIssues;

    res.json({
      feedback_new: fb.count ?? 0,
      reviews_pending: rv.count ?? 0,
      sentry_open,
      pro_new: pp.count ?? 0,
    });
  } catch (err: any) {
    console.error('Admin notifications error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// Mark one-off admin events (e.g. pro purchases) as seen — they clear on view.
app.post('/admin/events/seen', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user || user.id !== ADMIN_USER_ID) return res.status(403).json({ error: 'Not authorized' });
    await supabaseAdmin.from('admin_events').update({ seen: true }).eq('seen', false);
    res.json({ status: 'ok' });
  } catch (err: any) {
    console.error('Admin events seen error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// ----------------------------------------------------------
// Feedback: any signed-in user can submit; admin reviews.
// ----------------------------------------------------------
const FEEDBACK_SUBJECTS = ['bug', 'feature', 'content', 'billing', 'other'];
const FEEDBACK_STATUSES = ['new', 'in_progress', 'resolved'];

app.post('/feedback', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (rateLimited(`feedback:${user.id}`, 10, 60_000)) {
      return res.status(429).json({ error: 'Too many requests, slow down a moment.' });
    }
    const { subject, headline, content } = req.body;
    if (
      !FEEDBACK_SUBJECTS.includes(subject) ||
      typeof headline !== 'string' || headline.trim().length === 0 ||
      typeof content !== 'string' || content.trim().length === 0
    ) {
      return res.status(400).json({ error: 'subject, headline and content are required' });
    }
    const { error } = await supabaseAdmin.from('feedback').insert({
      user_id: user.id,
      email: user.email ?? null,
      subject,
      headline: headline.trim().slice(0, 200),
      content: content.trim().slice(0, 5000),
    });
    if (error) throw error;
    res.json({ status: 'ok' });
  } catch (err: any) {
    console.error('feedback submit error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

app.get('/admin/feedback', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user || user.id !== ADMIN_USER_ID) return res.status(403).json({ error: 'Not authorized' });
    const status = (req.query.status as string) || 'all';
    const subject = (req.query.subject as string) || 'all';
    const page = Math.max(0, parseInt((req.query.page as string) || '0', 10) || 0);
    const pageSize = 25;
    let q = supabaseAdmin
      .from('feedback')
      .select('id, user_id, email, subject, headline, content, status, created_at', { count: 'exact' });
    if (FEEDBACK_STATUSES.includes(status)) q = q.eq('status', status);
    if (FEEDBACK_SUBJECTS.includes(subject)) q = q.eq('subject', subject);
    q = q.order('created_at', { ascending: false }).range(page * pageSize, page * pageSize + pageSize - 1);
    const { data, count, error } = await q;
    if (error) throw error;

    const { data: statusRows } = await supabaseAdmin.from('feedback').select('status');
    const counts: Record<string, number> = { all: 0, new: 0, in_progress: 0, resolved: 0 };
    (statusRows ?? []).forEach((r: any) => {
      counts.all += 1;
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    });

    res.json({ items: data ?? [], total: count ?? 0, page, pageSize, counts });
  } catch (err: any) {
    console.error('admin feedback list error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

app.post('/admin/feedback/status', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user || user.id !== ADMIN_USER_ID) return res.status(403).json({ error: 'Not authorized' });
    const { id, status } = req.body;
    if (!id || !FEEDBACK_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'id and valid status required' });
    }
    const { error } = await supabaseAdmin.from('feedback').update({ status }).eq('id', id);
    if (error) throw error;
    res.json({ status: 'ok' });
  } catch (err: any) {
    console.error('admin feedback status error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

app.post('/admin/feedback/delete', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user || user.id !== ADMIN_USER_ID) return res.status(403).json({ error: 'Not authorized' });
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });
    const { error } = await supabaseAdmin.from('feedback').delete().eq('id', id);
    if (error) throw error;
    res.json({ status: 'ok' });
  } catch (err: any) {
    console.error('admin feedback delete error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

app.post('/admin/set-tier', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user || user.id !== ADMIN_USER_ID) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const { userId, tier } = req.body;
    if (!userId || (tier !== 'free' && tier !== 'pro')) {
      return res.status(400).json({ error: 'userId and tier (free|pro) required' });
    }
    const { error } = await supabaseAdmin
      .from('user_profile')
      .upsert({ user_id: userId, subscription_tier: tier }, { onConflict: 'user_id' });
    if (error) throw error;
    res.json({ status: 'ok' });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

app.post('/admin/delete-user', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user || user.id !== ADMIN_USER_ID) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    if (userId === ADMIN_USER_ID) {
      return res.status(400).json({ error: 'You cannot delete your own admin account here.' });
    }
    // Deleting the auth user cascades to profiles -> conversations/messages/insights/etc.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
    res.json({ status: 'ok' });
  } catch (err: any) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// ----------------------------------------------------------
// Helpers
// ----------------------------------------------------------

/**
 * Returns the active base system prompt: the admin-edited version from
 * app_config if present, otherwise the built-in KOPELAI_SYSTEM_PROMPT.
 */
async function getBasePrompt(): Promise<string> {
  const { data } = await supabaseAdmin
    .from('app_config')
    .select('value')
    .eq('key', 'system_prompt')
    .maybeSingle();
  const v = data?.value;
  return v && v.trim().length > 0 ? v : KOPELAI_SYSTEM_PROMPT;
}

// ── Knowledge base (RAG) helpers ───────────────────────────────────────────

/** Extract plain text from an uploaded PDF / DOCX / TXT / MD buffer. */
async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const name = filename.toLowerCase();
  if (name.endsWith('.pdf')) {
    const data = await pdf(buffer);
    return data.text;
  }
  if (name.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (name.endsWith('.txt') || name.endsWith('.md')) {
    return buffer.toString('utf8');
  }
  throw new Error('Unsupported file type. Use PDF, DOCX, TXT, or MD.');
}

/** Split text into ~1000-char chunks with ~150-char overlap, on whitespace boundaries. */
function chunkText(text: string, size = 1000, overlap = 150): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);
    if (end < clean.length) {
      const lastSpace = clean.lastIndexOf(' ', end);
      if (lastSpace > start + size * 0.5) end = lastSpace;
    }
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = end - overlap;
  }
  return chunks.filter((c) => c.length > 0);
}

/** Embed an array of texts with OpenAI (batched). */
async function embedTexts(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  // The embedding model caps input at 8192 tokens. A long pasted message (e.g. a
  // full session transcript used as the RAG query) blows past that and returns a
  // 400, so clamp each input to a safe character budget — kept conservative
  // because Hebrew is token-dense. Plenty of signal for semantic retrieval.
  const MAX_EMBED_CHARS = 6000;
  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts
      .slice(i, i + 100)
      .map((t) => (t.length > MAX_EMBED_CHARS ? t.slice(0, MAX_EMBED_CHARS) : t));
    const res = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: batch });
    for (const d of res.data) out.push(d.embedding as number[]);
  }
  return out;
}

/** Retrieve the most relevant knowledge-base excerpts for a query. */
async function getKnowledgeContext(query: string): Promise<string> {
  if (!query || query.trim().length === 0) return '';
  try {
    const [embedding] = await embedTexts([query]);
    const { data, error } = await supabaseAdmin.rpc('match_kb_chunks', {
      query_embedding: JSON.stringify(embedding),
      match_count: 6,
    });
    if (error || !data || data.length === 0) return '';
    const excerpts = (data as { content: string; similarity: number }[])
      .filter((d) => d.similarity > 0.2)
      .map((d, i) => `[${i + 1}] ${d.content}`)
      .join('\n\n');
    if (!excerpts) return '';
    return `\n\n# Reference material (from the practice's knowledge base)\nThe following excerpts may be relevant to this conversation. Usually integrate the ideas naturally, in your own voice. You may occasionally quote a short line verbatim and faithfully — but ONLY text that actually appears in the excerpts below, attributed plainly to Kopel's lecture or to Frankl. Never quote or attribute anything that isn't present here, and never show the [n] numbers.\n\n${excerpts}`;
  } catch (err) {
    console.error('getKnowledgeContext failed:', err);
    return '';
  }
}

/**
 * Build the system prompt for a /chat request, combining the KopelAi character
 * prompt with this user's profile memory and a language directive.
 */
// System prompt is returned as Anthropic content blocks so we can prompt-cache
// the large, static base prompt. The base block is identical across every
// message in a conversation, so after the first call it's served from cache at
// ~10% of the input price (cache read $0.30/M vs $3/M) — a real margin saver.
// The dynamic block (per-query RAG, per-user memory, language, wind-down) is
// not cached because it changes.
type SystemBlock = { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } };

async function buildSystemPrompt(
  userId: string | undefined,
  language: 'he' | 'en',
  lastUserMessage?: string,
  windDown = false,
  isProEffective = false,
  channel: 'web' | 'whatsapp' = 'web',
  sessionMinutes = 0
): Promise<SystemBlock[]> {
  const basePrompt = await getBasePrompt();
  const knowledge = await getKnowledgeContext(lastUserMessage ?? '');

  const langDirective =
    language === 'he'
      ? '\n\nThe user prefers Hebrew. Respond in Hebrew unless they switch to English.'
      : '\n\nThe user prefers English. Respond in English unless they switch to Hebrew.';

  // On a free user's last allowed message of the day, ask Kopel to bring this
  // turn to a warm, natural resting point instead of opening new threads — so
  // the daily wall lands at a closing beat rather than mid-thought.
  const windDownDirective = windDown
    ? '\n\n# Closing beat\n\nThis is the last exchange available in this session. Respond fully and warmly, then gently bring this turn to a natural resting point — offer a small thought to sit with, rather than opening a new line of inquiry. Do not mention limits, plans, or payment; just let it land softly.'
    : '';

  // WhatsApp replies should read like thoughtful texts, not web-length essays.
  const channelDirective = channel === 'whatsapp'
    ? '\n\n# WhatsApp\n\nYou are replying over WhatsApp. Keep it short and conversational — usually 1–4 sentences, like a warm text message. No headings, no long lists. Offer one gentle reflection or question at a time.'
    : '';

  // Time-awareness: a real therapist watches the clock and closes the hour around
  // the 50-minute mark. We pass the elapsed minutes of the current sitting and
  // nudge Kopel to steer toward a close — softly near 40, more firmly past ~55.
  const sessionTimeDirective = (() => {
    if (channel !== 'web' || !sessionMinutes || sessionMinutes < 20) return '';
    if (sessionMinutes >= 30) {
      return `\n\n# Time — bring the session to a close\n\nThis sitting has run about ${sessionMinutes} minutes — at the length of a full session. Close it now, the way a therapist does: name it warmly, help them gather the one thing most worth taking from today, and suggest picking it up another time. You may invite them to end the session here. Don't open a new line of inquiry.`;
    }
    return `\n\n# Time — approaching the end\n\nThis sitting has run about ${sessionMinutes} minutes — getting close to the natural length of a session. Like a therapist mindful of the clock, begin steering gently toward a close: help them land what matters most from today and let them know you're nearing the end of the session. No abrupt stop — just start rounding off.`;
  })();

  // The static base prompt is cached; everything dynamic goes in a second block.
  const baseBlock: SystemBlock = { type: 'text', text: basePrompt, cache_control: { type: 'ephemeral' } };
  const dynamic = (rest: string): SystemBlock[] =>
    rest.trim().length > 0 ? [baseBlock, { type: 'text', text: rest }] : [baseBlock];

  if (!userId) {
    return dynamic(knowledge + langDirective + windDownDirective + channelDirective + sessionTimeDirective);
  }

  const { data: profile } = await supabaseAdmin
    .from('user_profile')
    .select('prompt_summary, subscription_tier')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  // Cross-session memory is a paid feature. Free users get a fresh start every
  // session — never inject a remembered profile, even if one exists in the DB.
  // Trial users (isProEffective) get memory too, so they feel the paid value.
  const isPro = isProEffective || profile?.subscription_tier === 'pro';

  let memorySection = '';
  if (isPro && profile?.prompt_summary && profile.prompt_summary.trim().length > 0) {
    memorySection = `\n\n# What you remember about this person\n\n${profile.prompt_summary}\n\nUse this naturally, in your loose-memory voice. Don't quote it back. Don't list things. Reference it only when it serves them.`;
  } else {
    memorySection = `\n\n# What you remember about this person\n\nThis is a fresh session and you have no memory of past conversations with this person. Don't pretend to remember things you don't, and don't claim to recognize them.`;
  }

  return dynamic(knowledge + memorySection + langDirective + windDownDirective + channelDirective + sessionTimeDirective);
}

// Try to extract JSON from a Claude response, handling cases where it includes prose
function extractJSON(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch {
        /* fall through */
      }
    }
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        /* fall through */
      }
    }
    throw new Error('Could not extract JSON from response');
  }
}

// Tolerant JSON parse for model output that may be slightly truncated. Tries a
// strict parse first; on failure, rebuilds a valid object by closing any open
// string and brackets and dropping a dangling trailing comma / key. Best-effort
// salvage so a near-complete analysis still renders instead of erroring.
function parseLooseJSON(input: string): any {
  try {
    return extractJSON(input);
  } catch {
    /* fall through to repair */
  }
  let s = input;
  const start = s.indexOf('{');
  if (start > 0) s = s.slice(start);
  let inStr = false;
  let esc = false;
  const stack: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { if (inStr) esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ']') stack.pop();
  }
  let out = s;
  if (inStr) out += '"';               // close an open string value
  out = out.replace(/,\s*$/, '');       // drop a dangling trailing comma
  out = out.replace(/,?\s*"[^"]*"\s*:\s*$/, ''); // drop a dangling "key": with no value
  for (let i = stack.length - 1; i >= 0; i--) out += stack[i] === '{' ? '}' : ']';
  return JSON.parse(out);
}

// ----------------------------------------------------------
// Chat endpoint
// ----------------------------------------------------------
app.post('/chat', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (rateLimited(`chat:${user.id}`, 40, 60_000)) {
      return res.status(429).json({ error: 'Too many messages, slow down a moment.' });
    }

    const { messages, language, session_minutes } = req.body;
    const userId = user.id;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // ── Free-tier daily hard wall ────────────────────────────────────────────
    // Free users get FREE_DAILY_MESSAGE_LIMIT messages per Israel-calendar day.
    // The counter lives in daily_usage (server-side, untouched by the session
    // wipe), so it can't be reset by reloading. Pro is unlimited.
    let windDown = false;
    let remaining: number | null = null;
    const { data: tierRow } = await supabaseAdmin
      .from('user_profile')
      .select('subscription_tier, trial_ends_at, referral_pro_until')
      .eq('user_id', userId)
      .maybeSingle();
    // Full Pro (paid OR referral-comped) is uncapped. Trial users get Pro
    // features but are metered at the higher cap. Free users get the lower cap.
    const paidPro = tierRow?.subscription_tier === 'pro' || compedProActive(tierRow?.referral_pro_until);
    const onTrial = !paidPro && trialActiveFrom(tierRow?.trial_ends_at);
    const proFeatures = paidPro || onTrial; // memory + insights
    const dailyLimit = onTrial ? TRIAL_DAILY_MESSAGE_LIMIT : FREE_DAILY_MESSAGE_LIMIT;

    // Always record activity (daily_usage is our canonical, session-wipe-proof
    // activity log used by analytics). Only ENFORCE the cap for non-paid users.
    const { data: count, error: bumpErr } = await supabaseAdmin.rpc('bump_daily_usage', {
      p_user: userId,
    });
    if (bumpErr) {
      console.error('bump_daily_usage failed:', bumpErr);
      // Fail open: never block a paying-customer-to-be on an infra hiccup.
    } else if (!paidPro && typeof count === 'number') {
      if (count > dailyLimit) {
        return res.status(429).json({
          error: 'Daily message limit reached.',
          code: 'daily_limit_reached',
          limit: dailyLimit,
          trial: onTrial,
        });
      }
      remaining = Math.max(0, dailyLimit - count);
      // The final allowed message of the day winds down gracefully.
      windDown = count === dailyLimit;
    }

    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user')?.content;
    const sessionMinutes = typeof session_minutes === 'number' && session_minutes > 0 ? Math.floor(session_minutes) : 0;
    const systemPrompt = await buildSystemPrompt(userId, language ?? 'he', lastUserMessage, windDown, proFeatures, 'web', sessionMinutes);
    const cappedMessages = messages.slice(-30);

    // Prompt-cache the conversation prefix: marking the last message caches
    // everything up to it, so the next turn re-reads the shared history at the
    // cache price instead of full input price. The bulk of per-message cost is
    // the growing history, so this is the biggest margin lever.
    const apiMessages = cappedMessages.map((m: any, i: number) =>
      i === cappedMessages.length - 1
        ? { role: m.role, content: [{ type: 'text' as const, text: m.content, cache_control: { type: 'ephemeral' as const } }] }
        : { role: m.role, content: m.content }
    );

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system: systemPrompt,
      messages: apiMessages,
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const text = textBlock && textBlock.type === 'text' ? textBlock.text : '';

    // Tree: showing up today waters the tree (daily streak). Fire-and-forget so
    // it never adds latency to the reply; the helper no-ops for non-Pro users.
    void awardDailyStreak(userId);

    res.json({ text, usage: response.usage, remaining });
  } catch (err: any) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// ----------------------------------------------------------
// Daily usage — lets the chat UI lock the composer on load if a free user has
// already hit today's wall (e.g. returned later the same day).
// ----------------------------------------------------------
app.get('/usage', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: tierRow } = await supabaseAdmin
      .from('user_profile')
      .select('subscription_tier, trial_ends_at, referral_pro_until')
      .eq('user_id', user.id)
      .maybeSingle();
    const paidPro = tierRow?.subscription_tier === 'pro' || compedProActive(tierRow?.referral_pro_until);
    const onTrial = !paidPro && trialActiveFrom(tierRow?.trial_ends_at);
    // Trial can be started only if never started before (and not anonymous/pro).
    const trialAvailable = !paidPro && !onTrial && !tierRow?.trial_ends_at && !user.is_anonymous;

    if (paidPro) {
      // Paid Pro is uncapped — no wall.
      return res.json({ tier: 'pro', count: 0, limit: null, reached: false, trial: false, trialDaysLeft: 0, trialAvailable: false });
    }

    // Free and trial are both metered (trial at the higher cap, with Pro features).
    const limit = onTrial ? TRIAL_DAILY_MESSAGE_LIMIT : FREE_DAILY_MESSAGE_LIMIT;
    const { data: count } = await supabaseAdmin.rpc('get_daily_usage', { p_user: user.id });
    const used = typeof count === 'number' ? count : 0;
    res.json({
      tier: onTrial ? 'pro' : 'free', // 'pro' keeps the UI in full-feature mode
      count: used,
      limit,
      reached: used >= limit,
      trial: onTrial,
      trialDaysLeft: onTrial ? trialDaysLeftFrom(tierRow?.trial_ends_at) : 0,
      trialAvailable,
    });
  } catch (err: any) {
    console.error('usage error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// ----------------------------------------------------------
// Record marketing/content consent (the signup checkbox). Stored on profiles.
// ----------------------------------------------------------
app.post('/marketing-consent', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const consent = req.body?.consent === true;
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ marketing_consent: consent })
      .eq('id', user.id);
    if (error) {
      console.error('marketing-consent update failed:', error);
      return res.status(500).json({ error: 'Could not save consent' });
    }
    res.json({ ok: true, marketing_consent: consent });
  } catch (err: any) {
    console.error('marketing-consent error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// ----------------------------------------------------------
// Start the opt-in 14-day Pro trial. One-time per user; can't be restarted.
// ----------------------------------------------------------
app.post('/start-trial', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (user.is_anonymous) {
      return res.status(403).json({ error: 'Sign up to start a trial', code: 'signup_required' });
    }

    const { data: tierRow } = await supabaseAdmin
      .from('user_profile')
      .select('subscription_tier, trial_ends_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (tierRow?.subscription_tier === 'pro') {
      return res.status(400).json({ error: 'Already on Pro', code: 'already_pro' });
    }
    if (tierRow?.trial_ends_at) {
      // Already started (or used) — never restart.
      return res.status(409).json({ error: 'Trial already used', code: 'trial_used' });
    }

    const endsAt = new Date(Date.now() + PRO_TRIAL_DAYS * 86_400_000).toISOString();
    const { error: upErr } = await supabaseAdmin
      .from('user_profile')
      .upsert({ user_id: user.id, trial_ends_at: endsAt }, { onConflict: 'user_id' });
    if (upErr) {
      console.error('start-trial upsert failed:', upErr);
      return res.status(500).json({ error: 'Could not start trial' });
    }

    res.json({ trialEndsAt: endsAt, trialDaysLeft: PRO_TRIAL_DAYS });
  } catch (err: any) {
    console.error('start-trial error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// ----------------------------------------------------------
// Referral program — "give a month, get a month".
// ----------------------------------------------------------
const REFERRAL_SITE = process.env.PUBLIC_SITE_URL || 'https://kopelai.com';

// My referral link + stats (lazily creates a code).
app.get('/referral', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: prof } = await supabaseAdmin
      .from('user_profile').select('referral_code, referral_pro_until').eq('user_id', user.id).maybeSingle();
    let code = prof?.referral_code ?? null;
    if (!code) {
      for (let i = 0; i < 5; i++) {
        const candidate = 'K' + crypto.randomBytes(3).toString('hex').toUpperCase();
        const { data: taken } = await supabaseAdmin.from('user_profile').select('user_id').eq('referral_code', candidate).maybeSingle();
        if (taken) continue;
        const { error } = await supabaseAdmin.from('user_profile').upsert({ user_id: user.id, referral_code: candidate }, { onConflict: 'user_id' });
        if (!error) { code = candidate; break; }
      }
    }

    const [joinedR, rewardedR] = await Promise.all([
      supabaseAdmin.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', user.id),
      supabaseAdmin.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', user.id).eq('status', 'rewarded'),
    ]);

    res.json({
      code,
      url: code ? `${REFERRAL_SITE}/?ref=${code}` : null,
      joined: joinedR.count ?? 0,
      rewarded: rewardedR.count ?? 0,
      proUntil: prof?.referral_pro_until ?? null,
      active: compedProActive(prof?.referral_pro_until),
    });
  } catch (err: any) {
    console.error('referral error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// Claim a referral code (called once, right after the referee signs up).
app.post('/referral/claim', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (user.is_anonymous) return res.json({ ok: false });

    const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';
    if (!code) return res.json({ ok: false });

    const { data: referrer } = await supabaseAdmin.from('user_profile').select('user_id').eq('referral_code', code).maybeSingle();
    if (!referrer || referrer.user_id === user.id) return res.json({ ok: false });

    const { data: existing } = await supabaseAdmin.from('referrals').select('id').eq('referee_id', user.id).maybeSingle();
    if (existing) return res.json({ ok: true, already: true });

    // Just record the link — the referee gets no special gift. The referrer earns
    // a free month only once this referee converts to paid Pro (Ching webhook).
    await supabaseAdmin.from('referrals').insert({ referrer_id: referrer.user_id, referee_id: user.id, code, status: 'pending' });
    res.json({ ok: true });
  } catch (err: any) {
    console.error('referral claim error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// ----------------------------------------------------------
// Transcribe endpoint
// ----------------------------------------------------------
app.post('/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (rateLimited(`transcribe:${user.id}`, 20, 60_000)) {
      return res.status(429).json({ error: 'Too many uploads, slow down a moment.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const language = (req.body.language as string) || 'he';
    const fname = req.file.originalname || 'audio.m4a';
    const ftype = req.file.mimetype || 'audio/m4a';

    // Try the newer model; fall back to whisper-1 (most lenient + widely available)
    // if it errors (model access, or an iOS mp4 it doesn't like). Re-create the
    // file each attempt because the stream is consumed on use.
    let text = '';
    try {
      const f1 = await OpenAI.toFile(Readable.from(req.file.buffer), fname, { type: ftype });
      const t1 = await openai.audio.transcriptions.create({ file: f1, model: 'gpt-4o-transcribe', language: language === 'he' ? 'he' : 'en' });
      text = t1.text;
    } catch (e1: any) {
      console.error('gpt-4o-transcribe failed, falling back to whisper-1:', e1?.message);
      const f2 = await OpenAI.toFile(Readable.from(req.file.buffer), fname, { type: ftype });
      const t2 = await openai.audio.transcriptions.create({ file: f2, model: 'whisper-1', language: language === 'he' ? 'he' : 'en' });
      text = t2.text;
    }

    res.json({ text });
  } catch (err: any) {
    console.error('Transcribe error:', err);
    res.status(500).json({ error: err.message ?? 'Transcription failed' });
  }
});

// ----------------------------------------------------------
// Understand an uploaded file: image -> Claude vision; document -> extracted text.
// Returns text the conversation can reason about.
// ----------------------------------------------------------
app.post('/understand-file', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (rateLimited(`file:${user.id}`, 20, 60_000)) {
      return res.status(429).json({ error: 'Too many uploads, slow down a moment.' });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const name = (req.file.originalname || '').toLowerCase();
    const language = req.body.language === 'en' ? 'en' : 'he';
    const mime = req.file.mimetype || '';
    const isAudio = /\.(mp3|m4a|wav|ogg|oga|aac|flac|webm)$/.test(name) || mime.startsWith('audio/');
    const isImage = /\.(png|jpe?g|webp|gif)$/.test(name) || mime.startsWith('image/');

    if (isAudio) {
      const audioFile = await OpenAI.toFile(
        Readable.from(req.file.buffer),
        req.file.originalname || 'audio.m4a',
        { type: mime || 'audio/m4a' }
      );
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'gpt-4o-transcribe',
        language: language === 'he' ? 'he' : 'en',
      });
      return res.json({ kind: 'audio', text: transcription.text });
    }

    if (isImage) {
      let mediaType = req.file.mimetype || 'image/png';
      if (mediaType === 'image/jpg') mediaType = 'image/jpeg';
      const b64 = req.file.buffer.toString('base64');
      const prompt =
        language === 'he'
          ? 'תאר מה רואים בתמונה הזו בצורה מפורטת ורלוונטית למטפל שמשתף אותה ברפלקציה אישית. אם יש טקסט, תמלל אותו. ענה בעברית.'
          : 'Describe what is in this image in detail, relevant to a therapist sharing it in personal reflection. If there is text, transcribe it. Answer in English.';
      const resp = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType as any, data: b64 } },
              { type: 'text', text: prompt },
            ],
          },
        ],
      });
      const block = resp.content.find((b) => b.type === 'text');
      const text = block && block.type === 'text' ? block.text : '';
      return res.json({ kind: 'image', text });
    }

    // Document: extract text (PDF/DOCX/TXT/MD)
    const extracted = await extractText(req.file.buffer, req.file.originalname);
    return res.json({ kind: 'document', text: extracted.slice(0, 6000) });
  } catch (err: any) {
    console.error('Understand-file error:', err);
    res.status(500).json({ error: err.message ?? 'Could not read the file' });
  }
});

// ----------------------------------------------------------
// Consolidate a conversation into memory + insights (the "end session" brain).
// Self-contained; reused by /end-conversation (web) and the WhatsApp idle
// sweeper. Pro/trial get memory + insights; free users just get it closed.
// ----------------------------------------------------------
type ConsolidateResult = { status: string; tier: 'free' | 'pro'; insights_count: number; summary?: string };
async function consolidateConversation(conversationId: string): Promise<ConsolidateResult> {
  {
    const { data: convo } = await supabaseAdmin
      .from('conversations')
      .select('user_id')
      .eq('id', conversationId)
      .maybeSingle();
    if (!convo) return { status: 'not_found', tier: 'free', insights_count: 0 };
    const userId = convo.user_id as string;

    // 1. Fetch all messages from this conversation
    const { data: messages, error: msgErr } = await supabaseAdmin
      .from('messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgErr) throw msgErr;
    if (!messages || messages.length === 0) {
      await supabaseAdmin.from('conversations').update({ ended_at: new Date().toISOString() }).eq('id', conversationId);
      return { status: 'ok', tier: 'free', insights_count: 0 };
    }

    const transcript = messages
      .map((m) => `[id:${m.id}] ${m.role === 'user' ? 'User' : 'KopelAi'}: ${m.content}`)
      .join('\n\n');

    // Memory + insights are a paid feature. For free users, just close the
    // conversation — no profile summary, no insight extraction, nothing stored
    // that would be remembered next session.
    const { data: tierRow } = await supabaseAdmin
      .from('user_profile')
      .select('subscription_tier, trial_ends_at, referral_pro_until')
      .eq('user_id', userId)
      .maybeSingle();
    // Trial + referral-comped users get memory + insights too (effective Pro).
    const isPro = tierRow?.subscription_tier === 'pro'
      || compedProActive(tierRow?.referral_pro_until)
      || trialActiveFrom(tierRow?.trial_ends_at);

    if (!isPro) {
      await supabaseAdmin
        .from('conversations')
        .update({ ended_at: new Date().toISOString(), message_count: messages.length })
        .eq('id', conversationId);
      return { status: 'ok', tier: 'free', insights_count: 0 };
    }

    // 2. Generate session summary.
    // Detect the conversation's dominant language from the transcript and pin the
    // summary to it up front — a trailing "use the same language" hint gets
    // ignored on short chats, so Hebrew conversations were being summarized in
    // English on the history page.
    // Judge language from the message contents only — not the transcript, whose
    // "[id:…] User:/KopelAi:" scaffolding is Latin and would skew short chats.
    const contentOnly = messages.map((m) => m.content).join(' ');
    const hebChars = (contentOnly.match(/[֐-׿]/g) ?? []).length;
    const latChars = (contentOnly.match(/[A-Za-z]/g) ?? []).length;
    const summaryLang = hebChars >= latChars ? 'Hebrew' : 'English';
    const summaryPrompt = `Write the summary in ${summaryLang}. This is required: match the language of the conversation below, not the language of these instructions.

Below is a conversation between KopelAi (a self-reflection AI) and a user.

Write a concise summary (3-5 sentences) covering:
- Main topics discussed
- Anything notable about how the user thinks, feels, or approaches things
- Open threads — things mentioned but not explored deeply that would be worth returning to

Write in third person about the user. Be specific, not generic.

Conversation:
${transcript}`;

    const summaryResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 500,
      messages: [{ role: 'user', content: summaryPrompt }],
    });

    const summaryBlock = summaryResponse.content.find((b) => b.type === 'text');
    const summary = summaryBlock && summaryBlock.type === 'text' ? summaryBlock.text : '';

    await supabaseAdmin
      .from('conversations')
      .update({
        summary,
        ended_at: new Date().toISOString(),
        message_count: messages.length,
      })
      .eq('id', conversationId);

    // 3. Update persistent user profile
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profile')
      .select('prompt_summary')
      .eq('user_id', userId)
      .maybeSingle();

    const previousProfile = existingProfile?.prompt_summary ?? '';

    const profilePrompt = `You maintain an evolving understanding of a person, based on their conversations with KopelAi.

Below is what you knew about them before, and a summary of their most recent conversation. Produce an UPDATED understanding of this person — preserving what's still relevant, integrating what's new, and reorganizing if needed.

Keep it under 400 words. Write in concise third-person notes. Group by themes (e.g. how they think, what they care about, recurring patterns, open threads). Be specific. Don't pad with generalities.

What you knew before:
${previousProfile || '(nothing yet — this is the first conversation)'}

New conversation summary:
${summary}

Updated understanding:`;

    const profileResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 800,
      messages: [{ role: 'user', content: profilePrompt }],
    });

    const profileBlock = profileResponse.content.find((b) => b.type === 'text');
    const newProfileSummary = profileBlock && profileBlock.type === 'text' ? profileBlock.text : '';

    // 4. Extract per-category insights
    const categoryList = INSIGHT_CATEGORIES.map((c) => `  "${c.key}"`).join(',\n');

    const insightsPrompt = `You generate evidence-based insights about a person, organized into categories.

You will be given:
1. A profile of what we know about this person from all conversations so far
2. The transcript of their most recent conversation, with each message tagged [id:UUID]

Your job: produce up to ONE insight per category, ONLY where you have real evidence to support it. Skip categories where you don't have meaningful, specific evidence — do not include filler.

For each insight you produce:
- "category": one of the keys below
- "content": a gentle, tentative impression in Kopel's voice — 1-2 sentences, in the language the user used (Hebrew if they spoke Hebrew, English if English). Speak in the first person as Kopel and address the therapist warmly and directly ("you"). Offer it as something you noticed, open to their correction — never a verdict, diagnosis, or fixed label.
- "source_message_ids": array of message IDs from the transcript that support this insight (at least one)
- "confidence": integer 1-10 (1 = weak hint, 10 = clearly stated multiple times)

Available category keys:
[
${categoryList}
]

Tone — this is the most important rule:
Write in the spirit of Buber's "I–Thou": a meeting between two people, not an expert labeling a subject. Be warm, humble, and tentative. Hedge every observation — use openings like "נראה לי ש…", "יש לי תחושה ש…", "אולי", "ייתכן ש…" (Hebrew) or "it seems to me…", "I get the sense that…", "maybe…", "I might be wrong, but…" (English). Frame insights as a soft reflection the therapist can recognize or push back on.
- Avoid definitive trait-labels and clinical/diagnostic phrasing. Do NOT write things like "tends to hold onto clients" / "נוטה להחזיק מטופלים". Instead, soften and relate: "נראה לי שקשה לך להיפרד ממטופלים — שהם נשארים איתך גם אחרי שהקשר נגמר."
- Stay specific and grounded in what they actually said — tentative does not mean vague or horoscope-like. No flattery, no filler. Better to skip a category than to fluff it.
- Use the user's own language (Hebrew/English) for "content".
- Source message IDs must be ones that appeared in the transcript with [id:UUID] markers.

Profile so far:
${newProfileSummary}

Conversation transcript:
${transcript}

Return ONLY valid JSON in this exact shape, with no surrounding prose or markdown:
{
  "insights": [
    {
      "category": "values",
      "content": "...",
      "source_message_ids": ["uuid-here"],
      "confidence": 7
    }
  ]
}`;

    const insightsResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 3000,
      messages: [{ role: 'user', content: insightsPrompt }],
    });

    const insightsTextBlock = insightsResponse.content.find((b) => b.type === 'text');
    const insightsRaw = insightsTextBlock && insightsTextBlock.type === 'text' ? insightsTextBlock.text : '';

    let parsedInsights: { insights: any[] } = { insights: [] };
    try {
      parsedInsights = extractJSON(insightsRaw);
    } catch (parseErr) {
      console.error('Insight JSON parse failed:', parseErr, '\nRaw:', insightsRaw);
    }

    const validInsights = (parsedInsights.insights || []).filter((ins: any) => {
      const validCategory = INSIGHT_CATEGORIES.some((c) => c.key === ins.category);
      const hasContent = typeof ins.content === 'string' && ins.content.trim().length > 0;
      const hasSources = Array.isArray(ins.source_message_ids) && ins.source_message_ids.length > 0;
      return validCategory && hasContent && hasSources;
    });

    // 5. Replace insights for each category that has a new one
    for (const ins of validInsights) {
      await supabaseAdmin
        .from('insights')
        .delete()
        .eq('user_id', userId)
        .eq('category', ins.category);

      await supabaseAdmin.from('insights').insert({
        user_id: userId,
        category: ins.category,
        content: ins.content,
        source_message_ids: ins.source_message_ids,
        confidence: ins.confidence,
      });
    }

    // 6. Generate a short, user-facing opener in the conversation's language (ONCE)
    const conversationLanguage = /[\u0590-\u05FF]/.test(
      messages.find((m) => m.role === 'user')?.content ?? ''
    )
      ? 'he'
      : 'en';

    const openerPrompt =
      conversationLanguage === 'he'
        ? `הינה סיכום של מה שאני יודע על האדם הזה כרגע:

${newProfileSummary}

כתוב פתיח קצר (2-3 משפטים, עברית, גוף שני - אתה/את) שיופיע בראש דף ה"תובנות" של האדם. הפתיח צריך להיות:
- חם אבל לא חנפני
- ספציפי, לא גנרי
- להזכיר משהו אחד או שניים שמתבלטים מהפרופיל
- לא לסכם הכל - רק להציג את הטון

החזר רק את הפתיח, בלי כותרות או הסברים.`
        : `Here's what I know about this person right now:

${newProfileSummary}

Write a short opener (2-3 sentences, English, second person) for the top of their "insights" page. The opener should be:
- Warm but not sycophantic
- Specific, not generic
- Mention one or two things that stand out from the profile
- Not summarize everything — just set the tone

Return only the opener, with no headers or explanations.`;

    const openerResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 200,
      messages: [{ role: 'user', content: openerPrompt }],
    });

    const openerBlock = openerResponse.content.find((b) => b.type === 'text');
    const displayOpener =
      openerBlock && openerBlock.type === 'text' ? openerBlock.text.trim() : '';

    // 7. Single profile upsert with everything
    await supabaseAdmin.from('user_profile').upsert(
      {
        user_id: userId,
        prompt_summary: newProfileSummary,
        display_opener: displayOpener,
        last_updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    return { status: 'ok', tier: 'pro', insights_count: validInsights.length, summary };
  }
}

// ----------------------------------------------------------
// End conversation (web): verify ownership, then consolidate.
// ----------------------------------------------------------
app.post('/end-conversation', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (rateLimited(`end:${user.id}`, 20, 60_000)) {
      return res.status(429).json({ error: 'Too many requests, slow down a moment.' });
    }
    const { conversationId } = req.body;
    if (!conversationId) return res.status(400).json({ error: 'conversationId is required' });
    const { data: convo } = await supabaseAdmin
      .from('conversations').select('user_id').eq('id', conversationId).maybeSingle();
    if (!convo || convo.user_id !== user.id) return res.status(403).json({ error: 'Not your conversation' });

    const result = await consolidateConversation(conversationId);
    // Tree: ending a reflective session earns a collectible drop (+3) on that
    // conversation's analysis page. No-ops for non-Pro.
    void awardWater(user.id, 3, {
      source: 'session', ref: conversationId,
      route: `/app/insights/conversation/${conversationId}`,
      labelHe: 'סיום מפגש', labelEn: 'Session ended',
    });
    res.json({
      status: result.status,
      summary: result.summary,
      profile_updated: result.tier === 'pro',
      insights_count: result.insights_count,
      tier: result.tier,
    });
  } catch (err: any) {
    console.error('End conversation error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// ----------------------------------------------------------
// Per-conversation deep analysis (the "by conversation" tab in ניתוח).
// Generated on first view from the conversation's messages and cached on the
// conversation row. Pro/trial/comped only. Grounded references — no fabrication.
// ----------------------------------------------------------
const KOPEL_LECTURES_URL =
  'https://kopelel.co.il/%D7%91%D7%99%D7%9F-%D7%A9%D7%A2%D7%94-%D7%9C%D7%A9%D7%A2%D7%94-%D7%94%D7%A8%D7%A6%D7%90%D7%95%D7%AA-%D7%95%D7%95%D7%99%D7%93%D7%90%D7%95/';

app.get('/conversation/:id/analysis', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const conversationId = String(req.params.id ?? '');

    const { data: convo } = await supabaseAdmin
      .from('conversations')
      .select('user_id, analysis')
      .eq('id', conversationId)
      .is('deleted_at', null)
      .maybeSingle();
    if (!convo || convo.user_id !== user.id) return res.status(403).json({ error: 'Not your conversation' });

    // Per-conversation analysis is a paid feature, same gate as the rest of ניתוח.
    const { data: tierRow } = await supabaseAdmin
      .from('user_profile')
      .select('subscription_tier, trial_ends_at, referral_pro_until')
      .eq('user_id', user.id)
      .maybeSingle();
    const isPro =
      tierRow?.subscription_tier === 'pro' ||
      compedProActive(tierRow?.referral_pro_until) ||
      trialActiveFrom(tierRow?.trial_ends_at);
    if (!isPro) return res.status(403).json({ error: 'pro_required' });

    // Cached → return immediately.
    if (convo.analysis) return res.json({ analysis: convo.analysis, cached: true });

    // Generation is the expensive path — rate-limit it.
    if (rateLimited(`convanalysis:${user.id}`, 15, 60_000)) {
      return res.status(429).json({ error: 'Too many requests, slow down a moment.' });
    }

    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('id, role, content')
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: 'This conversation has no saved messages to analyze.' });
    }

    const transcript = messages
      .map((m) => `${m.role === 'user' ? 'Therapist' : 'KopelAi'}: ${m.content}`)
      .join('\n\n')
      .slice(0, 16000);
    const contentOnly = messages.map((m) => m.content).join(' ');
    const heb = (contentOnly.match(/[֐-׿]/g) ?? []).length;
    const lat = (contentOnly.match(/[A-Za-z]/g) ?? []).length;
    const lang = heb >= lat ? 'Hebrew' : 'English';

    const prompt = `You are analyzing ONE reflective conversation between a therapist (the user) and KopelAi, a psychoanalytic self-reflection guide. Produce a structured analysis written DIRECTLY TO the therapist, in the SECOND PERSON — address them as "you" throughout ("you came with…", "you noticed…", "what stopped you…"), never in the third person ("the therapist…"). In Hebrew, speak directly to them (פנייה ישירה). It is about them as a clinician, not about any client.

Write every text value in ${lang}. Output ONLY valid JSON, no markdown fences, no prose outside the JSON, with EXACTLY this shape:
{
  "summary": "2-4 sentences addressed to you: what you talked about and where it went",
  "appreciation": [ "a specific good thing YOU did in THIS conversation — name the concrete move (a brave intervention, real attunement, a restraint that served the client, staying with something hard) and, briefly, why it was good. Address it to 'you'. Specific praise only, never generic." ],
  "insights": [ { "title": "short label", "content": "1-3 sentences, addressed to you: a specific clinical observation about you visible in THIS conversation — a pattern, strength, blind spot, countertransference, or defense you showed" } ],
  "questions": [ "a reflective question worth sitting with, grounded in this conversation" ],
  "key_moments": [ { "moment": "a brief paraphrase or short quote of a turning point", "why": "why it mattered" } ],
  "references": [ { "kind": "lecture" | "book" | "concept", "title": "the lecture topic / book / concept name", "note": "1 sentence on why it connects to this conversation", "url": "optional, see rules" } ]
}

Counts: 3-5 appreciation, 2-5 insights, 2-4 questions, 1-4 key_moments, 1-4 references. Fewer is fine. If the conversation is too brief or trivial to analyze, return empty arrays and a one-line summary saying so. Appreciation must be earned and specific — if there genuinely isn't much to praise in a very short exchange, give fewer items rather than empty flattery.

References MUST be real and grounded — never fabricate:
- "lecture": one of psychoanalyst Kopel Eliezer's lecture topics when it genuinely fits (e.g. העברה, מרחב פוטנציאלי, נרקיסיזם, מיכל, אינטרסובייקטיביות, העמדה הדכאונית, אמפתיה, חשיפה עצמית). For a lecture you MAY set "url" to exactly "${KOPEL_LECTURES_URL}".
- "book": "אדם מחפש משמעות" (Viktor Frankl) when meaning/emptiness/suffering is relevant, or another genuinely well-known clinical text. Do NOT invent titles, authors, or editions.
- "concept": a well-established named psychological concept (transference, projective identification, the holding environment, the depressive position, existential vacuum, parallel process, enactment, etc.).
- NEVER invent a journal article, page number, author, edition, or URL. If unsure whether something real exists, use a "concept" instead. Omit "url" entirely unless it is exactly the Kopel lectures link above.

Be specific to THIS conversation, not generic. Throughout every field, speak directly to the therapist as "you" — never refer to them in the third person ("the therapist", "they"). In Hebrew use direct address (פנייה ישירה).

Conversation:
${transcript}`;

    // Generate the JSON. Prefill "{" so the model emits pure JSON (no prose
    // preamble, no markdown fence) — we re-add the "{" before parsing. The cap is
    // set very high so the analysis never gets cut off; we still detect a
    // max_tokens stop and retry once even higher, just in case.
    const genAnalysis = async (maxTokens: number) => {
      const resp = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: maxTokens,
        messages: [
          { role: 'user', content: prompt },
          { role: 'assistant', content: '{' },
        ],
      });
      const block = resp.content.find((b) => b.type === 'text');
      const raw = block && block.type === 'text' ? block.text : '';
      return { raw, truncated: resp.stop_reason === 'max_tokens' };
    };

    let { raw, truncated } = await genAnalysis(16000);
    if (truncated) {
      console.warn('Conversation analysis hit max_tokens at 16000; retrying higher');
      ({ raw, truncated } = await genAnalysis(32000));
    }

    let analysis: any;
    try {
      analysis = parseLooseJSON('{' + raw);
    } catch (e) {
      console.error('Conversation analysis: could not parse JSON', { truncated, err: e });
      return res.status(502).json({
        error: truncated
          ? 'The analysis was too long to finish. Please try again.'
          : 'Could not read the analysis this time. Please try again.',
      });
    }

    await supabaseAdmin
      .from('conversations')
      .update({ analysis, analysis_generated_at: new Date().toISOString() })
      .eq('id', conversationId);

    // Tree: generating an analysis earns a collectible (+2), and Kopel's praise
    // earns its own collectible (+1 per הוקרה item) — both on this analysis page.
    const apprCount = Array.isArray(analysis?.appreciation) ? analysis.appreciation.length : 0;
    const aRoute = `/app/insights/conversation/${conversationId}`;
    void awardWater(user.id, 2, { source: 'analysis', ref: conversationId, route: aRoute, labelHe: 'ניתוח שיחה', labelEn: 'Conversation analysis' });
    void awardWater(user.id, apprCount, { source: 'praise', ref: conversationId, route: aRoute, labelHe: 'הוקרה מקופל', labelEn: 'Praise from Kopel' });

    res.json({ analysis, cached: false });
  } catch (err: any) {
    console.error('Conversation analysis error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// ==========================================================================
// Relationship orange-tree — a gentle gamified bond with Kopel for Pro/trial.
// Water drops are the currency; the tree drinks ~1/day, grows when watered,
// wilts (never dies) when dry, and freezes when Pro/trial lapses. All state is
// in tree_state and settled lazily on read/award — no cron needed.
// ==========================================================================
const TREE_HOUR_MS = 60 * 60 * 1000;
const TREE_DAY_MS = 24 * TREE_HOUR_MS;
const BUCKET_CAPACITY = 24;        // a full bucket = 24h of water
const TREE_DRAIN_PER_HOUR = 1;     // the tree drinks 1 drop/hour from the bucket
const TREE_WILT_GRACE_HOURS = 72;  // wilts after the bucket has been empty ~3 days
const TREE_STARTER_BUCKET = 24;    // planted with a full bucket (a day of water)
const TREE_STARTER_RESERVE = 24;   // plus a day of earned drops banked to refill
// Cumulative growth points (= drops the tree has drunk) to reach each stage.
const TREE_STAGES = [
  { key: 'seed', at: 0 },
  { key: 'sprout', at: 24 },
  { key: 'seedling', at: 72 },
  { key: 'sapling', at: 168 },
  { key: 'young', at: 360 },
  { key: 'blossom', at: 600 },
  { key: 'fruiting', at: 1000 },
];

type TierRow = { subscription_tier?: string | null; trial_ends_at?: string | null; referral_pro_until?: string | null } | null;
function isEffectivePro(tierRow: TierRow): boolean {
  if (!tierRow) return false;
  return tierRow.subscription_tier === 'pro'
    || compedProActive(tierRow.referral_pro_until)
    || trialActiveFrom(tierRow.trial_ends_at);
}

type TreeRow = {
  user_id: string; planted_at: string; water_drops: number; bucket: number; growth_points: number;
  last_tick_at: string; dry_since: string | null; streak_days: number;
  last_active_day: string | null; claimed: Record<string, boolean>;
};

async function treeTier(userId: string): Promise<TierRow> {
  const { data } = await supabaseAdmin
    .from('user_profile').select('subscription_tier, trial_ends_at, referral_pro_until')
    .eq('user_id', userId).maybeSingle();
  return data as TierRow;
}
async function getTreeRow(userId: string): Promise<TreeRow | null> {
  const { data } = await supabaseAdmin.from('tree_state').select('*').eq('user_id', userId).maybeSingle();
  return (data as TreeRow) ?? null;
}
async function plantTree(userId: string): Promise<TreeRow | null> {
  const nowIso = new Date().toISOString();
  const row: TreeRow = {
    user_id: userId, planted_at: nowIso, water_drops: TREE_STARTER_RESERVE, bucket: TREE_STARTER_BUCKET,
    growth_points: 0, last_tick_at: nowIso, dry_since: null, streak_days: 0, last_active_day: null, claimed: { onboarding: true },
  };
  const { data } = await supabaseAdmin.from('tree_state').upsert(row, { onConflict: 'user_id' }).select('*').maybeSingle();
  return (data as TreeRow) ?? null;
}

// Advance the tree from last_tick_at to now in whole-day steps (mutates row).
// `frozen` (Pro/trial lapsed) pauses consumption, growth and wilting.
function settleTree(row: TreeRow, now: number, frozen: boolean) {
  if (frozen) { row.last_tick_at = new Date(now).toISOString(); return; }
  const last = new Date(row.last_tick_at).getTime();
  let hours = Math.floor((now - last) / TREE_HOUR_MS);
  if (hours <= 0) return; // advance only on whole hours; remainder carries over
  let cursor = last;
  while (hours-- > 0) {
    cursor += TREE_HOUR_MS;
    if (row.bucket > 0) {
      row.bucket -= TREE_DRAIN_PER_HOUR;       // tree drinks from the bucket
      row.growth_points += 1;                  // and grows for it
      if (row.bucket <= 0) { row.bucket = 0; row.dry_since = new Date(cursor).toISOString(); }
      else { row.dry_since = null; }
    } else if (!row.dry_since) {
      row.dry_since = new Date(cursor).toISOString();
    }
  }
  row.last_tick_at = new Date(cursor).toISOString();
}

async function persistTree(row: TreeRow) {
  await supabaseAdmin.from('tree_state').update({
    water_drops: row.water_drops, bucket: row.bucket, growth_points: row.growth_points, last_tick_at: row.last_tick_at,
    dry_since: row.dry_since, streak_days: row.streak_days, last_active_day: row.last_active_day,
    claimed: row.claimed, updated_at: new Date().toISOString(),
  }).eq('user_id', row.user_id);
}

function treeView(row: TreeRow, frozen: boolean) {
  const now = Date.now();
  let stageIndex = 0;
  TREE_STAGES.forEach((s, i) => { if (row.growth_points >= s.at) stageIndex = i; });
  const next = TREE_STAGES[stageIndex + 1] ?? null;
  const dryMs = row.dry_since ? now - new Date(row.dry_since).getTime() : 0;
  const wilting = row.bucket <= 0 && dryMs >= TREE_WILT_GRACE_HOURS * TREE_HOUR_MS;
  return {
    planted: true, frozen,
    reserve: row.water_drops,        // earned drops banked, waiting to be poured in
    bucket: row.bucket,              // drops in the bucket right now (drains 1/hr)
    bucketCapacity: BUCKET_CAPACITY,
    hoursLeft: row.bucket,           // 1 drop ≈ 1 hour of water
    canFill: row.water_drops > 0 && row.bucket < BUCKET_CAPACITY && !frozen,
    growthPoints: row.growth_points,
    stageIndex, stageKey: TREE_STAGES[stageIndex].key, stageCount: TREE_STAGES.length,
    currentStageAt: TREE_STAGES[stageIndex].at, nextStageAt: next?.at ?? null,
    wilting, streakDays: row.streak_days, plantedAt: row.planted_at,
  };
}

// Award water drops as a COLLECTIBLE pending reward — it is NOT added to the
// reserve until the user taps the drop at its source. Pro/trial only. For
// one-time rewards pass onceKey (no-ops if already claimed). Never throws.
type AwardOpts = { source: string; route: string; labelHe: string; labelEn: string; ref?: string; onceKey?: string };
async function awardWater(userId: string, amount: number, opts: AwardOpts): Promise<void> {
  try {
    if (amount <= 0) return;
    if (!isEffectivePro(await treeTier(userId))) return;
    let row = await getTreeRow(userId);
    if (!row) { row = await plantTree(userId); if (!row) return; }
    if (opts.onceKey && row.claimed && row.claimed[opts.onceKey]) return;
    await supabaseAdmin.from('water_rewards').insert({
      user_id: userId, amount, source: opts.source, ref: opts.ref ?? null,
      route: opts.route, label_he: opts.labelHe, label_en: opts.labelEn,
    });
    if (opts.onceKey) {
      row.claimed = { ...(row.claimed || {}), [opts.onceKey]: true };
      await persistTree(row);
    }
  } catch (e) { console.error('awardWater failed', e); }
}

// Daily streak — once per (UTC) day; bonus grows 2→6 with consecutive days.
// Creates a collectible reward (tapped at the chat page).
async function awardDailyStreak(userId: string): Promise<void> {
  try {
    if (!isEffectivePro(await treeTier(userId))) return;
    let row = await getTreeRow(userId);
    if (!row) { row = await plantTree(userId); if (!row) return; }
    const today = new Date().toISOString().slice(0, 10);
    if (row.last_active_day === today) return;
    const yesterday = new Date(Date.now() - TREE_DAY_MS).toISOString().slice(0, 10);
    row.streak_days = row.last_active_day === yesterday ? row.streak_days + 1 : 1;
    const bonus = Math.min(2 + (row.streak_days - 1), 6);
    row.last_active_day = today;
    await persistTree(row);
    await supabaseAdmin.from('water_rewards').insert({
      user_id: userId, amount: bonus, source: 'streak', ref: null, route: '/app/conversation',
      label_he: `כניסה יומית · רצף ${row.streak_days} 🔥`, label_en: `Daily check-in · ${row.streak_days}-day streak`,
    });
  } catch (e) { console.error('awardDailyStreak failed', e); }
}

app.get('/tree', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const effPro = isEffectivePro(await treeTier(user.id));
    let row = await getTreeRow(user.id);
    if (!row) {
      if (!effPro) return res.json({ planted: false });
      row = await plantTree(user.id);
      if (!row) return res.status(500).json({ error: 'Could not plant tree' });
    }
    settleTree(row, Date.now(), !effPro);
    await persistTree(row);
    res.json(treeView(row, !effPro));
  } catch (err: any) {
    console.error('Tree error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// Manually pour earned (reserve) drops into the bucket, up to its 24 capacity.
// This is the daily ritual — the tree only drinks from the bucket.
app.post('/tree/fill', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const effPro = isEffectivePro(await treeTier(user.id));
    let row = await getTreeRow(user.id);
    if (!row) {
      if (!effPro) return res.status(403).json({ error: 'pro_required' });
      row = await plantTree(user.id);
      if (!row) return res.status(500).json({ error: 'Could not plant tree' });
    }
    settleTree(row, Date.now(), !effPro);
    let poured = 0;
    if (effPro) {
      poured = Math.min(row.water_drops, BUCKET_CAPACITY - row.bucket);
      if (poured > 0) {
        row.bucket += poured;
        row.water_drops -= poured;
        row.dry_since = null;
      }
    }
    await persistTree(row);
    res.json({ ...treeView(row, !effPro), poured });
  } catch (err: any) {
    console.error('Tree fill error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// Uncollected water-drop rewards — each is a collectible the user taps at its
// source. Returned oldest-first so the header trail walks them in order.
app.get('/water-rewards', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { data } = await supabaseAdmin
      .from('water_rewards')
      .select('id, amount, source, ref, route, label_he, label_en, created_at')
      .eq('user_id', user.id)
      .is('collected_at', null)
      .order('created_at', { ascending: true });
    res.json({ rewards: data ?? [] });
  } catch (err: any) {
    console.error('Water rewards error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// Collect one reward → pour its drops into the reserve. Atomic on collected_at
// so a double-tap can't double-credit.
app.post('/water-rewards/collect', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const id = req.body?.id;
    if (!id) return res.status(400).json({ error: 'id required' });

    const { data: claimed } = await supabaseAdmin
      .from('water_rewards')
      .update({ collected_at: new Date().toISOString() })
      .eq('id', id).eq('user_id', user.id).is('collected_at', null)
      .select('amount').maybeSingle();

    if (claimed && typeof claimed.amount === 'number') {
      let row = await getTreeRow(user.id);
      if (!row) row = await plantTree(user.id);
      if (row) {
        const effPro = isEffectivePro(await treeTier(user.id));
        settleTree(row, Date.now(), !effPro);
        row.water_drops += claimed.amount;
        await persistTree(row);
      }
    }
    const { count } = await supabaseAdmin
      .from('water_rewards').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).is('collected_at', null);
    res.json({ collected: claimed?.amount ?? 0, remaining: count ?? 0 });
  } catch (err: any) {
    console.error('Collect reward error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// =====================================================
// Account deletion + restore
// =====================================================

// Permanently erase the user's entire chat history + the memory built from it.
// Hard delete (not soft) — for privacy-sensitive users who don't want anything
// retained, and so Kopel truly "forgets" past conversations.
app.post('/delete-history', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const uid = user.id;
    // Order respects FKs; deleting conversations also cascades messages, but we
    // clear each table explicitly to be sure nothing is left behind.
    await supabaseAdmin.from('messages').delete().eq('user_id', uid);
    await supabaseAdmin.from('insights').delete().eq('user_id', uid);
    await supabaseAdmin.from('themes').delete().eq('user_id', uid);
    await supabaseAdmin.from('conversations').delete().eq('user_id', uid);
    // Reset the remembered profile so Kopel starts fresh next time.
    await supabaseAdmin.from('user_profile')
      .update({ prompt_summary: null, display_opener: null })
      .eq('user_id', uid);
    res.json({ ok: true });
  } catch (err: any) {
    console.error('Delete history error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// Permanently erase one conversation (and its messages/insights/themes).
app.post('/delete-conversation', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const conversationId = req.body?.conversationId;
    if (!conversationId) return res.status(400).json({ error: 'conversationId is required' });

    // Verify ownership before deleting anything.
    const { data: convo } = await supabaseAdmin
      .from('conversations').select('user_id').eq('id', conversationId).maybeSingle();
    if (!convo || convo.user_id !== user.id) return res.status(403).json({ error: 'Not your conversation' });

    await supabaseAdmin.from('messages').delete().eq('conversation_id', conversationId);
    await supabaseAdmin.from('conversations').delete().eq('id', conversationId);
    res.json({ ok: true });
  } catch (err: any) {
    console.error('Delete conversation error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

app.post('/delete-account', async (req: Request, res: Response) => {
  try {
    const authed = await getAuthedUser(req);
    if (!authed) return res.status(401).json({ error: 'Unauthorized' });
    const userId = authed.id;

    const { error: softDeleteErr } = await supabaseAdmin.rpc('soft_delete_user', {
      target_user_id: userId,
    });

    if (softDeleteErr) {
      console.error('soft_delete_user failed:', softDeleteErr);
      return res.status(500).json({ error: 'Failed to soft-delete data', details: softDeleteErr.message });
    }

    const { error: signOutErr } = await supabaseAdmin.auth.admin.signOut(userId);

    if (signOutErr) {
      console.warn('Sign out failed during deletion:', signOutErr);
    }

    res.json({
      success: true,
      message: 'Account scheduled for deletion. You have 7 days to restore.',
      deletedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('delete-account error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.post('/restore-account', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId required' });
    }

    const { error } = await supabaseAdmin.rpc('restore_user', {
      target_user_id: userId,
    });

    if (error) {
      return res.status(400).json({
        error: 'Restore failed. Either the account is not deleted, or the 7-day grace period has expired.',
        details: error.message,
      });
    }

    res.json({
      success: true,
      message: 'Account restored.',
    });
  } catch (err: any) {
    console.error('restore-account error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.get('/deletion-status', async (req: Request, res: Response) => {
  try {
    const authed = await getAuthedUser(req);
    if (!authed) return res.status(401).json({ error: 'Unauthorized' });
    const userId = authed.id;

    const { data, error } = await supabaseAdmin.rpc('get_deletion_status', {
      target_user_id: userId,
    });

    if (error) {
      console.error('get_deletion_status failed:', error);
      return res.status(500).json({ error: 'Server error', details: error.message });
    }

    res.json(data);
  } catch (err: any) {
    console.error('deletion-status error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.get('/export-data', async (req: Request, res: Response) => {
  try {
    const authed = await getAuthedUser(req);
    if (!authed) return res.status(401).json({ error: 'Unauthorized' });
    const userId = authed.id;

    const [profileRes, conversationsRes, messagesRes, userProfileRes, insightsRes, themesRes] =
      await Promise.all([
        supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .is('deleted_at', null)
          .maybeSingle(),
        supabaseAdmin
          .from('conversations')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('started_at', { ascending: true }),
        supabaseAdmin
          .from('messages')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('created_at', { ascending: true }),
        supabaseAdmin
          .from('user_profile')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .maybeSingle(),
        supabaseAdmin
          .from('insights')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('confidence', { ascending: false }),
        supabaseAdmin
          .from('themes')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null),
      ]);

    if (profileRes.error) {
      console.error('Profile fetch failed:', profileRes.error);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }

    if (!profileRes.data) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);

    const exportData = {
      meta: {
        exported_at: new Date().toISOString(),
        kopelai_version: '1.0',
        user_id: userId,
        email: authUser?.user?.email ?? null,
      },
      profile: profileRes.data,
      conversations: conversationsRes.data ?? [],
      messages: messagesRes.data ?? [],
      ai_generated_profile: userProfileRes.data,
      insights: insightsRes.data ?? [],
      themes: themesRes.data ?? [],
      counts: {
        conversations: conversationsRes.data?.length ?? 0,
        messages: messagesRes.data?.length ?? 0,
        insights: insightsRes.data?.length ?? 0,
        themes: themesRes.data?.length ?? 0,
      },
    };

    res.json(exportData);
  } catch (err: any) {
    console.error('export-data error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// =====================================================
// Conversation history — the user's own past sessions, searchable.
// (Free users' sessions are wiped each visit, so history is effectively Pro.)
// =====================================================
app.get('/history', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const userId = user.id;
    const q = ((req.query.q as string) || '').trim();
    const from = (req.query.from as string) || '';
    const to = (req.query.to as string) || '';

    let cq = supabaseAdmin
      .from('conversations')
      .select('id, started_at, ended_at, summary, channel, message_count')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('started_at', { ascending: false })
      .limit(200);
    if (from) cq = cq.gte('started_at', from);
    if (to) cq = cq.lte('started_at', `${to}T23:59:59`);
    const { data: convos, error } = await cq;
    if (error) throw error;
    let list = convos ?? [];

    // Text search: keep only conversations that have a matching message.
    if (q) {
      const { data: hits } = await supabaseAdmin
        .from('messages')
        .select('conversation_id')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .ilike('content', `%${q}%`)
        .limit(2000);
      const ids = new Set((hits ?? []).map((m: any) => m.conversation_id));
      list = list.filter((c: any) => ids.has(c.id));
    }

    // Add a short preview (first user message) per conversation.
    const ids = list.slice(0, 100).map((c: any) => c.id);
    const snippet: Record<string, string> = {};
    if (ids.length) {
      const { data: msgs } = await supabaseAdmin
        .from('messages')
        .select('conversation_id, role, content, created_at')
        .in('conversation_id', ids)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      for (const m of msgs ?? []) {
        if (m.role === 'user' && !snippet[m.conversation_id]) {
          snippet[m.conversation_id] = (m.content as string).slice(0, 120);
        }
      }
    }

    res.json({
      conversations: list.slice(0, 100).map((c: any) => ({
        id: c.id,
        started_at: c.started_at,
        ended_at: c.ended_at,
        summary: c.summary ?? null,
        channel: c.channel ?? 'web',
        message_count: c.message_count ?? 0,
        snippet: snippet[c.id] ?? '',
      })),
    });
  } catch (err: any) {
    console.error('history error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

app.get('/history/messages', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const conversationId = (req.query.conversationId as string) || '';
    if (!conversationId) return res.status(400).json({ error: 'conversationId required' });

    const { data: convo } = await supabaseAdmin
      .from('conversations').select('user_id').eq('id', conversationId).maybeSingle();
    if (!convo || convo.user_id !== user.id) return res.status(403).json({ error: 'Not your conversation' });

    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    res.json({ messages: messages ?? [] });
  } catch (err: any) {
    console.error('history messages error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// =====================================================
// Reviews / testimonials. Anyone logged in can leave one (proof = real account);
// moderated by admin before they show publicly on the landing page.
// =====================================================
const REVIEW_STATUSES = ['pending', 'approved', 'hidden'];

// Public: approved reviews for the landing page (no auth).
app.get('/reviews', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('id, display_name, rating, content, created_at')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    const reviews = data ?? [];
    const count = reviews.length;
    const average = count > 0 ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / count : 0;
    res.json({ reviews, count, average: Math.round(average * 10) / 10 });
  } catch (err: any) {
    console.error('reviews list error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// Auth: submit/update your own review (one per account). Always lands as pending.
app.post('/reviews', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (user.is_anonymous) return res.status(403).json({ error: 'Sign in to leave a review', code: 'signup_required' });
    if (rateLimited(`review:${user.id}`, 5, 60_000)) return res.status(429).json({ error: 'Slow down a moment.' });

    const rating = Number(req.body?.rating);
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    let displayName = typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : '';
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'rating must be 1-5' });
    if (content.length === 0) return res.status(400).json({ error: 'content required' });

    if (!displayName) {
      const meta = (user as any).user_metadata || {};
      displayName = meta.full_name || meta.name || (user.email ? user.email.split('@')[0] : 'משתמש');
    }

    const { error } = await supabaseAdmin.from('reviews').upsert({
      user_id: user.id,
      display_name: displayName.slice(0, 80),
      rating,
      content: content.slice(0, 1000),
      status: 'pending',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (error) throw error;
    // Tree: leaving a review is a one-time collectible milestone (+10).
    void awardWater(user.id, 10, { source: 'review', route: '/app/review', labelHe: 'השארת המלצה', labelEn: 'Left a review', onceKey: 'review' });
    res.json({ status: 'ok', moderation: 'pending' });
  } catch (err: any) {
    console.error('review submit error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// Admin: list all reviews (optionally by status).
app.get('/admin/reviews', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user || user.id !== ADMIN_USER_ID) return res.status(403).json({ error: 'Not authorized' });
    const status = (req.query.status as string) || 'all';
    let q = supabaseAdmin.from('reviews').select('id, user_id, display_name, rating, content, status, created_at').order('created_at', { ascending: false }).limit(200);
    if (REVIEW_STATUSES.includes(status)) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ reviews: data ?? [] });
  } catch (err: any) {
    console.error('admin reviews list error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

app.post('/admin/reviews/status', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user || user.id !== ADMIN_USER_ID) return res.status(403).json({ error: 'Not authorized' });
    const { id, status } = req.body;
    if (!id || !REVIEW_STATUSES.includes(status)) return res.status(400).json({ error: 'id and valid status required' });
    const { error } = await supabaseAdmin.from('reviews').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    res.json({ status: 'ok' });
  } catch (err: any) {
    console.error('admin review status error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

app.post('/admin/reviews/delete', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user || user.id !== ADMIN_USER_ID) return res.status(403).json({ error: 'Not authorized' });
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });
    const { error } = await supabaseAdmin.from('reviews').delete().eq('id', id);
    if (error) throw error;
    res.json({ status: 'ok' });
  } catch (err: any) {
    console.error('admin review delete error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// =====================================================
// WhatsApp agent — a second doorway into the same Kopel.
// Inert until WHATSAPP_* env vars are set (see docs/whatsapp-setup.md).
// =====================================================
const WA = {
  token: process.env.WHATSAPP_ACCESS_TOKEN || '',
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
  appSecret: process.env.WHATSAPP_APP_SECRET || '',
  displayNumber: process.env.WHATSAPP_NUMBER || '', // digits only, e.g. 972500000000 (for wa.me links)
};
const waConfigured = () => Boolean(WA.token && WA.phoneNumberId);
// Public visibility switch: keep the "Connect WhatsApp" UI hidden from regular
// users until WhatsApp is verified + live. Flip WHATSAPP_LIVE=1 on Railway to
// reveal it to everyone. The bot itself (webhook/replies) works regardless, so
// allowlisted test numbers keep functioning while this is off.
const waLiveFlag = () => process.env.WHATSAPP_LIVE === '1' || process.env.WHATSAPP_LIVE === 'true';
const isHe = (t: string) => /[֐-׿]/.test(t);

async function sendWhatsApp(to: string, body: string) {
  if (!waConfigured() || !body) return;
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${WA.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WA.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: body.slice(0, 4096) } }),
    });
    if (!r.ok) console.error('WhatsApp send failed:', r.status, await r.text());
  } catch (e) {
    console.error('WhatsApp send error:', e);
  }
}

// The brain: same memory/tier/wall logic as /chat, just over WhatsApp.
async function handleWhatsAppMessage(phone: string, text: string) {
  const lang: 'he' | 'en' = isHe(text) ? 'he' : 'en';
  const trimmed = (text || '').trim();
  if (!trimmed) return;

  // 1. Who is this? Resolve phone → account.
  const { data: link } = await supabaseAdmin
    .from('whatsapp_links').select('user_id').eq('phone', phone).maybeSingle();

  // 2. Not linked → try to redeem a link code, else send onboarding.
  if (!link) {
    const candidate = trimmed.toUpperCase().replace(/\s+/g, '');
    const { data: codeRow } = await supabaseAdmin
      .from('whatsapp_link_codes').select('user_id, created_at').eq('code', candidate).maybeSingle();
    if (codeRow && Date.now() - new Date(codeRow.created_at).getTime() < 30 * 60_000) {
      await supabaseAdmin.from('whatsapp_links').upsert({ phone, user_id: codeRow.user_id }, { onConflict: 'phone' });
      await supabaseAdmin.from('whatsapp_link_codes').delete().eq('user_id', codeRow.user_id);
      // Tree: connecting WhatsApp is a one-time collectible milestone (+5).
      void awardWater(codeRow.user_id, 5, { source: 'whatsapp', route: '/app/plan', labelHe: 'חיבור וואטסאפ', labelEn: 'Connected WhatsApp', onceKey: 'whatsapp' });
      await sendWhatsApp(phone, lang === 'he'
        ? 'היי, אני קופלAI. עכשיו אפשר לשוחח איתי גם כאן בוואטסאפ, ולא רק דרך האתר - כתוב/י לי מתי שבא לך, ואני כאן.'
        : "Hi, I'm KopelAi. You can now talk with me right here on WhatsApp, not only through the website — message me whenever you like, I'm here.");
      return;
    }
    await sendWhatsApp(phone, lang === 'he'
      ? 'היי, כאן קופלAI. כדי שאלווה אותך לאורך זמן צריך לחבר את הוואטסאפ לחשבון: היכנס/י ל-kopelai.com ← "מנוי" ← "חיבור וואטסאפ", ושלח/י לי את הקוד שתקבל/י.'
      : 'Hi, this is KopelAi. To accompany you over time, link your WhatsApp: go to kopelai.com → "Plan" → "Connect WhatsApp", and send me the code you get.');
    return;
  }

  const userId = link.user_id as string;

  // 3. Shared tier + daily wall (same counter as web).
  const { data: tierRow } = await supabaseAdmin
    .from('user_profile').select('subscription_tier, trial_ends_at, referral_pro_until').eq('user_id', userId).maybeSingle();
  const paidPro = tierRow?.subscription_tier === 'pro' || compedProActive(tierRow?.referral_pro_until);
  const onTrial = !paidPro && trialActiveFrom(tierRow?.trial_ends_at);
  const proFeatures = paidPro || onTrial;
  const dailyLimit = onTrial ? TRIAL_DAILY_MESSAGE_LIMIT : FREE_DAILY_MESSAGE_LIMIT;

  const { data: count } = await supabaseAdmin.rpc('bump_daily_usage', { p_user: userId });
  if (!paidPro && typeof count === 'number' && count > dailyLimit) {
    await sendWhatsApp(phone, lang === 'he'
      ? (onTrial ? 'הגענו למכסת ההודעות להיום 🙏 נתראה מחר להמשך.' : 'הגענו לסוף המכסה היומית בגרסה החינמית. נתראה מחר - או לשיחה ללא הגבלה, שדרגו לפרו ב-kopelai.com')
      : (onTrial ? "That's our messages for today 🙏 see you tomorrow." : "That's today's free limit. See you tomorrow — or go Pro for unlimited at kopelai.com"));
    return;
  }
  const windDown = !paidPro && typeof count === 'number' && count === dailyLimit;

  // 4. Find or open this user's active WhatsApp conversation.
  const { data: openConvo } = await supabaseAdmin
    .from('conversations').select('id')
    .eq('user_id', userId).eq('channel', 'whatsapp').is('ended_at', null).is('deleted_at', null)
    .order('started_at', { ascending: false }).limit(1).maybeSingle();
  let conversationId = openConvo?.id as string | undefined;
  if (!conversationId) {
    const { data: created } = await supabaseAdmin
      .from('conversations')
      .insert({ user_id: userId, language: lang, channel: 'whatsapp', started_at: new Date().toISOString() })
      .select('id').single();
    conversationId = created?.id;
  }
  if (!conversationId) {
    await sendWhatsApp(phone, lang === 'he' ? 'משהו השתבש, נסה/י שוב בעוד רגע.' : 'Something went wrong, please try again in a moment.');
    return;
  }

  // 5. Persist the user message.
  await supabaseAdmin.from('messages').insert({
    conversation_id: conversationId, user_id: userId, role: 'user', content: trimmed, language: lang, created_at: new Date().toISOString(),
  });

  // 6. Build context from the last messages of this thread.
  const { data: history } = await supabaseAdmin
    .from('messages').select('role, content').eq('conversation_id', conversationId)
    .is('deleted_at', null).order('created_at', { ascending: true }).limit(60);
  const recent = (history ?? []).slice(-30);

  // 7. Same brain — system prompt (with memory if Pro/trial) + model.
  const systemPrompt = await buildSystemPrompt(userId, lang, trimmed, windDown, proFeatures, 'whatsapp');
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: systemPrompt,
    messages: recent.map((m: any) => ({ role: m.role, content: m.content })),
  });
  const block = response.content.find((b) => b.type === 'text');
  const reply = block && block.type === 'text' ? block.text : '';

  // 8. Persist + send the reply.
  if (reply) {
    await supabaseAdmin.from('messages').insert({
      conversation_id: conversationId, user_id: userId, role: 'assistant', content: reply, language: lang, created_at: new Date().toISOString(),
    });
    await sendWhatsApp(phone, reply);
  }
}

// Webhook verification (Meta calls this once when you register the webhook).
app.get('/whatsapp/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && WA.verifyToken && token === WA.verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Incoming WhatsApp messages.
app.post('/whatsapp/webhook', async (req: Request, res: Response) => {
  // Verify the payload really came from Meta (when the app secret is set).
  if (WA.appSecret) {
    const sig = req.header('x-hub-signature-256') || '';
    const raw = ((req as any).rawBody as Buffer) ?? Buffer.from('');
    const expected = 'sha256=' + crypto.createHmac('sha256', WA.appSecret).update(raw).digest('hex');
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return res.sendStatus(401);
    }
  }
  res.sendStatus(200); // ack fast; process after
  try {
    for (const entry of req.body?.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const msg of change.value?.messages ?? []) {
          if (msg.type === 'text' && msg.text?.body) {
            await handleWhatsAppMessage(msg.from, msg.text.body);
          } else if (msg.from) {
            await sendWhatsApp(msg.from, 'כרגע אני קורא רק הודעות טקסט - כתוב/י לי במילים 🙂 / I can read text messages for now.');
          }
        }
      }
    }
  } catch (e) {
    console.error('WhatsApp webhook processing error:', e);
  }
});

// Web: is this account linked to WhatsApp, and is the feature live?
app.get('/whatsapp/status', async (req: Request, res: Response) => {
  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { data: link } = await supabaseAdmin.from('whatsapp_links').select('phone, linked_at').eq('user_id', user.id).maybeSingle();
  // Visible to the public only when live; admin always sees it (for testing).
  const visible = waConfigured() && (waLiveFlag() || user.id === ADMIN_USER_ID);
  res.json({ configured: visible, linked: Boolean(link), phone: link?.phone ?? null, number: WA.displayNumber || null });
});

// Web: generate a one-time link code + a wa.me deep link to send it.
app.post('/whatsapp/link-code', async (req: Request, res: Response) => {
  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!waConfigured()) return res.status(503).json({ error: 'whatsapp_not_configured' });
  const code = 'KOPEL-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  await supabaseAdmin.from('whatsapp_link_codes').delete().eq('user_id', user.id); // one active code per user
  const { error } = await supabaseAdmin.from('whatsapp_link_codes').insert({ code, user_id: user.id });
  if (error) return res.status(500).json({ error: 'Could not create code' });
  const waLink = WA.displayNumber ? `https://wa.me/${WA.displayNumber}?text=${encodeURIComponent(code)}` : null;
  res.json({ code, waLink, number: WA.displayNumber || null });
});

// Every 5 minutes: close WhatsApp threads idle for >30 min and consolidate
// their memory/insights (the WhatsApp equivalent of pressing "end session").
const WA_IDLE_MS = 30 * 60_000;
async function sweepIdleWhatsApp() {
  try {
    const cutoff = new Date(Date.now() - WA_IDLE_MS).toISOString();
    const { data: convos } = await supabaseAdmin
      .from('conversations').select('id')
      .eq('channel', 'whatsapp').is('ended_at', null).is('deleted_at', null).limit(50);
    for (const c of convos ?? []) {
      const { data: last } = await supabaseAdmin
        .from('messages').select('created_at').eq('conversation_id', c.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (!last) {
        await supabaseAdmin.from('conversations').update({ ended_at: new Date().toISOString() }).eq('id', c.id);
      } else if (last.created_at < cutoff) {
        await consolidateConversation(c.id);
      }
    }
  } catch (e) {
    console.error('WhatsApp idle sweep error:', e);
  }
}
if (waConfigured()) {
  setInterval(sweepIdleWhatsApp, 5 * 60_000);
}

// Sentry error handler — must be after all routes, before listen.
Sentry.setupExpressErrorHandler(app);

app.listen(port, () => {
  console.log(`kopelai-api listening on port ${port}`);
});