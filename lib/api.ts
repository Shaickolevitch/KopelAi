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
};

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
    throw new Error(`Chat API error (${response.status}): ${errorText}`);
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
  } | null;
  posthog: {
    configured: boolean;
    activeUsers7d?: number;
    events?: { event: string; count: number }[];
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
