// KopelAi needs its OWN backend + database. Do not point this at Zotani's API in
// production — therapist data must never land in Zotani's systems. Set
// NEXT_PUBLIC_API_URL to the KopelAi backend once it exists.
import { supabase } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

// The backend verifies this token and derives the user from it — never trusting
// a user id sent in the body.
async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase().auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type ChatResponse = {
  text: string;
  // For free users: messages left today after this one (null for Pro / unknown).
  remaining?: number | null;
};

// Thrown when a free user hits the daily message wall (HTTP 429 + code).
// The conversation page catches this specifically to show the wall UI.
export class DailyLimitError extends Error {
  limit: number;
  trial: boolean;
  constructor(limit: number, trial = false) {
    super('daily_limit_reached');
    this.name = 'DailyLimitError';
    this.limit = limit;
    this.trial = trial;
  }
}

export async function sendChat(
  messages: ChatMessage[],
  language: 'he' | 'en' = 'he'
): Promise<ChatResponse> {
  const response = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ messages, language }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 429) {
      try {
        const body = JSON.parse(errorText);
        if (body?.code === 'daily_limit_reached') {
          throw new DailyLimitError(body.limit ?? 0, body.trial ?? false);
        }
      } catch (e) {
        if (e instanceof DailyLimitError) throw e;
      }
    }
    throw new Error(`Chat API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

export type UsageInfo = {
  tier: 'free' | 'pro';
  count: number;
  limit: number | null;
  reached: boolean;
  // True while the user is in their 14-day Pro trial; days remaining.
  trial?: boolean;
  trialDaysLeft?: number;
  // True for a free user who has never started a trial (can opt in).
  trialAvailable?: boolean;
};

// Today's usage + trial state, so the chat UI can lock the composer on load and
// show the right banner.
export async function getUsage(): Promise<UsageInfo> {
  const response = await fetch(`${API_URL}/usage`, {
    headers: { ...(await authHeaders()) },
  });
  if (!response.ok) throw new Error(`Usage error (${response.status})`);
  return response.json();
}

// Record the user's marketing/content consent (from the signup checkbox).
export async function submitMarketingConsent(consent: boolean): Promise<void> {
  const response = await fetch(`${API_URL}/marketing-consent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ consent }),
  });
  if (!response.ok) throw new Error(`Consent error (${response.status})`);
}

// ── WhatsApp linking ────────────────────────────────────────────────────────
export type WhatsappStatus = { configured: boolean; linked: boolean; phone: string | null; number: string | null };

export async function getWhatsappStatus(): Promise<WhatsappStatus> {
  const response = await fetch(`${API_URL}/whatsapp/status`, { headers: { ...(await authHeaders()) } });
  if (!response.ok) throw new Error(`WhatsApp status error (${response.status})`);
  return response.json();
}

export async function getWhatsappLinkCode(): Promise<{ code: string; waLink: string | null; number: string | null }> {
  const response = await fetch(`${API_URL}/whatsapp/link-code`, {
    method: 'POST',
    headers: { ...(await authHeaders()) },
  });
  if (!response.ok) {
    let t = await response.text();
    try { t = JSON.parse(t).error ?? t; } catch {}
    throw new Error(t || 'Could not create link code');
  }
  return response.json();
}

// Activate the opt-in 14-day Pro trial (one-time per user).
export async function startTrial(): Promise<{ trialEndsAt: string; trialDaysLeft: number }> {
  const response = await fetch(`${API_URL}/start-trial`, {
    method: 'POST',
    headers: { ...(await authHeaders()) },
  });
  if (!response.ok) {
    let text = await response.text();
    try { text = JSON.parse(text).error ?? text; } catch {}
    throw new Error(text || 'Could not start trial');
  }
  return response.json();
}

// ── Admin: live system prompt ──────────────────────────────────────────────
export async function getSystemPrompt(): Promise<string> {
  const response = await fetch(`${API_URL}/system-prompt`, {
    headers: { ...(await authHeaders()) },
  });
  if (!response.ok) throw new Error(`Get prompt error (${response.status})`);
  const data = await response.json();
  return data.prompt ?? '';
}

export async function saveSystemPrompt(prompt: string) {
  const response = await fetch(`${API_URL}/system-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ prompt }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Save prompt error (${response.status}): ${errorText}`);
  }
  return response.json();
}

// ── Admin: knowledge base ───────────────────────────────────────────────────
export type KbDocument = {
  id: string;
  filename: string;
  char_count: number;
  chunk_count: number;
  created_at: string;
  file_size: number | null;
};

export async function uploadKbFile(file: File) {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`${API_URL}/admin/kb/upload`, {
    method: 'POST',
    headers: { ...(await authHeaders()) },
    body: form,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload error (${response.status}): ${errorText}`);
  }
  return response.json();
}

export async function listKbDocuments(): Promise<KbDocument[]> {
  const response = await fetch(`${API_URL}/admin/kb/documents`, {
    headers: { ...(await authHeaders()) },
  });
  if (!response.ok) throw new Error(`List error (${response.status})`);
  const data = await response.json();
  return data.documents ?? [];
}

export async function deleteKbDocument(id: string) {
  const response = await fetch(`${API_URL}/admin/kb/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Delete error (${response.status}): ${errorText}`);
  }
  return response.json();
}

// ── Admin: user management ──────────────────────────────────────────────────
export type AdminUser = {
  id: string;
  email: string | null;
  created_at: string;
  tier: 'free' | 'pro';
  deleted_at: string | null;
  last_active: string | null;
  marketing_consent: boolean;
};

export async function adminListUsers(params: {
  search?: string;
  tier?: string;
  page?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}): Promise<{
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.tier && params.tier !== 'all') q.set('tier', params.tier);
  q.set('page', String(params.page ?? 0));
  if (params.sortBy) q.set('sortBy', params.sortBy);
  if (params.sortDir) q.set('sortDir', params.sortDir);
  const response = await fetch(`${API_URL}/admin/users?${q.toString()}`, {
    headers: { ...(await authHeaders()) },
  });
  if (!response.ok) throw new Error(`List users error (${response.status})`);
  return response.json();
}

export type MonitoringSummary = {
  supabase: {
    total_users: number;
    pro_users: number;
    new_users_7d: number;
    active_users_7d: number;
    conversations_7d: number;
    messages_7d: number;
    daily?: { day: string; new_users: number; active_users: number; messages: number }[];
  } | null;
  posthog: {
    configured: boolean;
    activeUsers7d?: number;
    pageviews7d?: number;
    events?: { event: string; count: number }[];
    topPages?: { page: string; count: number }[];
    error?: string;
  };
  sentry: {
    configured: boolean;
    openIssues?: number;
    issues?: { title: string; count: number; lastSeen: string | null; permalink: string | null }[];
    error?: string;
  };
};

// ── Feedback ─────────────────────────────────────────────────────────────────
export type FeedbackItem = {
  id: string;
  user_id: string | null;
  email: string | null;
  subject: string;
  headline: string;
  content: string;
  status: 'new' | 'in_progress' | 'resolved';
  created_at: string;
};

export async function submitFeedback(subject: string, headline: string, content: string) {
  const response = await fetch(`${API_URL}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ subject, headline, content }),
  });
  if (!response.ok) {
    const t = await response.text();
    throw new Error(`Feedback error (${response.status}): ${t}`);
  }
  return response.json();
}

export async function adminListFeedback(params: { status?: string; subject?: string; page?: number }): Promise<{
  items: FeedbackItem[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<string, number>;
}> {
  const q = new URLSearchParams();
  if (params.status && params.status !== 'all') q.set('status', params.status);
  if (params.subject && params.subject !== 'all') q.set('subject', params.subject);
  q.set('page', String(params.page ?? 0));
  const response = await fetch(`${API_URL}/admin/feedback?${q.toString()}`, {
    headers: { ...(await authHeaders()) },
  });
  if (!response.ok) throw new Error(`Feedback list error (${response.status})`);
  return response.json();
}

export async function adminSetFeedbackStatus(id: string, status: 'new' | 'in_progress' | 'resolved') {
  const response = await fetch(`${API_URL}/admin/feedback/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ id, status }),
  });
  if (!response.ok) throw new Error(`Feedback status error (${response.status})`);
  return response.json();
}

export async function adminDeleteFeedback(id: string) {
  const response = await fetch(`${API_URL}/admin/feedback/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) throw new Error(`Feedback delete error (${response.status})`);
  return response.json();
}

export async function adminGetMonitoring(): Promise<MonitoringSummary> {
  const response = await fetch(`${API_URL}/admin/monitoring`, {
    headers: { ...(await authHeaders()) },
  });
  if (!response.ok) throw new Error(`Monitoring error (${response.status})`);
  return response.json();
}

// ── Admin: rich analytics dashboard ─────────────────────────────────────────
export type AnalyticsData = {
  kpis: {
    total_users: number;
    pro_users: number;
    trial_users: number;
    consented_users: number;
    dau: number;
    wau: number;
    mau: number;
    new_users_7d: number;
    new_users_30d: number;
    messages_30d: number;
    trials_started: number;
    trial_converted: number;
  };
  daily: { day: string; new_users: number; active_users: number; messages: number; cumulative_users: number }[];
  weekly: { week: string; active: number; new: number; returning: number; resurrected: number }[];
  cohorts: { cohort: string; size: number; retention: { offset: number; retained: number }[] }[];
  funnel: { signed_up: number; activated: number; trial_started: number; paid: number };
  revenue: { pro_users: number; est_mrr_nis: number };
};

export async function adminGetAnalytics(): Promise<AnalyticsData> {
  const response = await fetch(`${API_URL}/admin/analytics`, {
    headers: { ...(await authHeaders()) },
  });
  if (!response.ok) throw new Error(`Analytics error (${response.status})`);
  return response.json();
}

export async function adminSetTier(userId: string, tier: 'free' | 'pro') {
  const response = await fetch(`${API_URL}/admin/set-tier`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ userId, tier }),
  });
  if (!response.ok) {
    const t = await response.text();
    throw new Error(`Set tier error (${response.status}): ${t}`);
  }
  return response.json();
}

export async function adminDeleteUser(userId: string) {
  const response = await fetch(`${API_URL}/admin/delete-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ userId }),
  });
  if (!response.ok) {
    const t = await response.text();
    throw new Error(`Delete user error (${response.status}): ${t}`);
  }
  return response.json();
}

// Record audio in chat -> backend transcribes it to text.
export async function transcribeAudio(blob: Blob, language: 'he' | 'en' = 'he'): Promise<string> {
  const form = new FormData();
  form.append('audio', blob, 'audio.webm');
  form.append('language', language);
  const response = await fetch(`${API_URL}/transcribe`, {
    method: 'POST',
    headers: { ...(await authHeaders()) },
    body: form,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Transcribe error (${response.status}): ${errorText}`);
  }
  const data = await response.json();
  return data.text ?? '';
}

// Upload an image/document in chat; backend returns text KopelAi can reason about.
export async function understandFile(
  file: File,
  language: 'he' | 'en' = 'he'
): Promise<{ kind: 'image' | 'document'; text: string }> {
  const form = new FormData();
  form.append('file', file);
  form.append('language', language);
  const response = await fetch(`${API_URL}/understand-file`, {
    method: 'POST',
    headers: { ...(await authHeaders()) },
    body: form,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Understand file error (${response.status}): ${errorText}`);
  }
  return response.json();
}

export async function endConversation(conversationId: string) {
  const response = await fetch(`${API_URL}/end-conversation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ conversationId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`End conversation error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// ── Reviews / testimonials ───────────────────────────────────────────────────
export type PublicReview = { id: string; display_name: string; rating: number; content: string; created_at: string };

export async function getPublicReviews(): Promise<{ reviews: PublicReview[]; count: number; average: number }> {
  const r = await fetch(`${API_URL}/reviews`);
  if (!r.ok) throw new Error(`Reviews error (${r.status})`);
  return r.json();
}

export async function submitReview(rating: number, content: string, displayName?: string) {
  const r = await fetch(`${API_URL}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ rating, content, displayName }),
  });
  if (!r.ok) {
    let t = await r.text();
    try { t = JSON.parse(t).error ?? t; } catch {}
    throw new Error(t || 'Could not submit review');
  }
  return r.json();
}

export type AdminReview = {
  id: string; user_id: string; display_name: string; rating: number;
  content: string; status: 'pending' | 'approved' | 'hidden'; created_at: string;
};

export async function adminListReviews(status?: string): Promise<{ reviews: AdminReview[] }> {
  const q = status && status !== 'all' ? `?status=${status}` : '';
  const r = await fetch(`${API_URL}/admin/reviews${q}`, { headers: { ...(await authHeaders()) } });
  if (!r.ok) throw new Error(`Admin reviews error (${r.status})`);
  return r.json();
}

export async function adminSetReviewStatus(id: string, status: 'pending' | 'approved' | 'hidden') {
  const r = await fetch(`${API_URL}/admin/reviews/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ id, status }),
  });
  if (!r.ok) throw new Error(`Review status error (${r.status})`);
  return r.json();
}

export async function adminDeleteReview(id: string) {
  const r = await fetch(`${API_URL}/admin/reviews/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ id }),
  });
  if (!r.ok) throw new Error(`Review delete error (${r.status})`);
  return r.json();
}

// ── Admin notifications ──────────────────────────────────────────────────────
export type AdminNotifications = { feedback_new: number; reviews_pending: number; sentry_open: number; pro_new: number };

export async function getAdminNotifications(): Promise<AdminNotifications> {
  const r = await fetch(`${API_URL}/admin/notifications`, { headers: { ...(await authHeaders()) } });
  if (!r.ok) throw new Error(`Notifications error (${r.status})`);
  return r.json();
}

// Clears one-off events (e.g. new Pro purchases) once the admin has seen them.
export async function markAdminEventsSeen(): Promise<void> {
  await fetch(`${API_URL}/admin/events/seen`, { method: 'POST', headers: { ...(await authHeaders()) } });
}

// ── Conversation history ─────────────────────────────────────────────────────
export type HistoryConversation = {
  id: string; started_at: string; ended_at: string | null;
  summary: string | null; channel: string; message_count: number; snippet: string;
};

export async function getHistory(params: { q?: string; from?: string; to?: string }): Promise<{ conversations: HistoryConversation[] }> {
  const sp = new URLSearchParams();
  if (params.q) sp.set('q', params.q);
  if (params.from) sp.set('from', params.from);
  if (params.to) sp.set('to', params.to);
  const r = await fetch(`${API_URL}/history?${sp.toString()}`, { headers: { ...(await authHeaders()) } });
  if (!r.ok) throw new Error(`History error (${r.status})`);
  return r.json();
}

export async function getHistoryMessages(conversationId: string): Promise<{ messages: { role: 'user' | 'assistant'; content: string; created_at: string }[] }> {
  const r = await fetch(`${API_URL}/history/messages?conversationId=${encodeURIComponent(conversationId)}`, { headers: { ...(await authHeaders()) } });
  if (!r.ok) throw new Error(`History messages error (${r.status})`);
  return r.json();
}
