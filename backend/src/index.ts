import 'dotenv/config';
import './instrument'; // Sentry init — must come before other imports
import * as Sentry from '@sentry/node';
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
app.use(express.json({ limit: '1mb' }));

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
    const ALLOWED_SORT = ['name', 'created_at', 'last_active', 'tier'];
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
    const [eventRows, userRows] = await Promise.all([
      run("SELECT event, count() AS c FROM events WHERE timestamp > now() - INTERVAL 7 DAY GROUP BY event ORDER BY c DESC LIMIT 8"),
      run("SELECT count(DISTINCT person_id) AS c FROM events WHERE timestamp > now() - INTERVAL 7 DAY"),
    ]);
    return {
      configured: true,
      activeUsers7d: Number(userRows?.[0]?.[0] ?? 0),
      events: eventRows.map((row) => ({ event: String(row[0]), count: Number(row[1]) })),
    };
  } catch (e) {
    return { configured: true, error: e instanceof Error ? e.message : 'PostHog fetch failed' };
  }
}

async function getSentrySummary() {
  const token = process.env.SENTRY_AUTH_TOKEN; // secret — must be set in Railway
  const org = process.env.SENTRY_ORG || 'shaiyan';
  const project = process.env.SENTRY_PROJECT || 'kopelai';
  if (!token || !org || !project) return { configured: false };
  try {
    const r = await fetch(
      `https://sentry.io/api/0/projects/${org}/${project}/issues/?query=is:unresolved&statsPeriod=14d&limit=8`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!r.ok) throw new Error(`Sentry ${r.status}`);
    const issues = (await r.json()) as any[];
    return {
      configured: true,
      openIssues: issues.length,
      issues: issues.map((i) => ({
        title: i.title ?? i.metadata?.value ?? 'Issue',
        count: Number(i.count ?? 0),
        lastSeen: i.lastSeen ?? null,
        permalink: i.permalink ?? null,
      })),
    };
  } catch (e) {
    return { configured: true, error: e instanceof Error ? e.message : 'Sentry fetch failed' };
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
  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts.slice(i, i + 100);
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
    return `\n\n# Reference material (from the practice's knowledge base)\nThe following excerpts may be relevant to this conversation. Draw on them when useful; integrate the ideas naturally, don't quote verbatim or cite numbers unless asked.\n\n${excerpts}`;
  } catch (err) {
    console.error('getKnowledgeContext failed:', err);
    return '';
  }
}

/**
 * Build the system prompt for a /chat request, combining the KopelAi character
 * prompt with this user's profile memory and a language directive.
 */
async function buildSystemPrompt(
  userId: string | undefined,
  language: 'he' | 'en',
  lastUserMessage?: string
): Promise<string> {
  const basePrompt = await getBasePrompt();
  const knowledge = await getKnowledgeContext(lastUserMessage ?? '');

  const langDirective =
    language === 'he'
      ? '\n\nThe user prefers Hebrew. Respond in Hebrew unless they switch to English.'
      : '\n\nThe user prefers English. Respond in English unless they switch to Hebrew.';

  if (!userId) {
    return basePrompt + knowledge + langDirective;
  }

  const { data: profile } = await supabaseAdmin
    .from('user_profile')
    .select('prompt_summary, subscription_tier')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  // Cross-session memory is a paid feature. Free users get a fresh start every
  // session — never inject a remembered profile, even if one exists in the DB.
  const isPro = profile?.subscription_tier === 'pro';

  let memorySection = '';
  if (isPro && profile?.prompt_summary && profile.prompt_summary.trim().length > 0) {
    memorySection = `\n\n# What you remember about this person\n\n${profile.prompt_summary}\n\nUse this naturally, in your loose-memory voice. Don't quote it back. Don't list things. Reference it only when it serves them.`;
  } else {
    memorySection = `\n\n# What you remember about this person\n\nThis is a fresh session and you have no memory of past conversations with this person. Don't pretend to remember things you don't, and don't claim to recognize them.`;
  }

  return basePrompt + knowledge + memorySection + langDirective;
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

    const { messages, language } = req.body;
    const userId = user.id;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user')?.content;
    const systemPrompt = await buildSystemPrompt(userId, language ?? 'he', lastUserMessage);
    const cappedMessages = messages.slice(-30);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system: systemPrompt,
      messages: cappedMessages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const text = textBlock && textBlock.type === 'text' ? textBlock.text : '';

    res.json({ text, usage: response.usage });
  } catch (err: any) {
    console.error('Chat error:', err);
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

    const audioFile = await OpenAI.toFile(
      Readable.from(req.file.buffer),
      req.file.originalname || 'audio.m4a',
      { type: req.file.mimetype || 'audio/m4a' }
    );

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'gpt-4o-transcribe',
      language: language === 'he' ? 'he' : 'en',
    });

    res.json({ text: transcription.text });
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
// End conversation — summary, profile update, and insight extraction
// ----------------------------------------------------------
app.post('/end-conversation', async (req: Request, res: Response) => {
  try {
    const user = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (rateLimited(`end:${user.id}`, 20, 60_000)) {
      return res.status(429).json({ error: 'Too many requests, slow down a moment.' });
    }

    const { conversationId } = req.body;
    const userId = user.id;

    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required' });
    }

    // Verify this conversation belongs to the caller.
    const { data: convo } = await supabaseAdmin
      .from('conversations')
      .select('user_id')
      .eq('id', conversationId)
      .maybeSingle();
    if (!convo || convo.user_id !== userId) {
      return res.status(403).json({ error: 'Not your conversation' });
    }

    // 1. Fetch all messages from this conversation
    const { data: messages, error: msgErr } = await supabaseAdmin
      .from('messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgErr) throw msgErr;
    if (!messages || messages.length === 0) {
      return res.json({ status: 'ok', skipped: 'no messages' });
    }

    const transcript = messages
      .map((m) => `[id:${m.id}] ${m.role === 'user' ? 'User' : 'KopelAi'}: ${m.content}`)
      .join('\n\n');

    // Memory + insights are a paid feature. For free users, just close the
    // conversation — no profile summary, no insight extraction, nothing stored
    // that would be remembered next session.
    const { data: tierRow } = await supabaseAdmin
      .from('user_profile')
      .select('subscription_tier')
      .eq('user_id', userId)
      .maybeSingle();
    const isPro = tierRow?.subscription_tier === 'pro';

    if (!isPro) {
      await supabaseAdmin
        .from('conversations')
        .update({ ended_at: new Date().toISOString(), message_count: messages.length })
        .eq('id', conversationId);
      return res.json({ status: 'ok', tier: 'free', memory: false, insights_count: 0 });
    }

    // 2. Generate session summary
    const summaryPrompt = `Below is a conversation between KopelAi (a self-reflection AI) and a user.

Write a concise summary (3-5 sentences) covering:
- Main topics discussed
- Anything notable about how the user thinks, feels, or approaches things
- Open threads — things mentioned but not explored deeply that would be worth returning to

Write in third person about the user. Be specific, not generic. Use the same language the user used.

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

    res.json({
      status: 'ok',
      summary,
      profile_updated: true,
      insights_count: validInsights.length,
    });
  } catch (err: any) {
    console.error('End conversation error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// =====================================================
// Account deletion + restore
// =====================================================

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

// Sentry error handler — must be after all routes, before listen.
Sentry.setupExpressErrorHandler(app);

app.listen(port, () => {
  console.log(`kopelai-api listening on port ${port}`);
});