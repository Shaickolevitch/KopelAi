// KopelAi needs its OWN backend + database. Do not point this at Zotani's API in
// production — therapist data must never land in Zotani's systems. Set
// NEXT_PUBLIC_API_URL to the KopelAi backend once it exists.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export type DeletionStatus = {
  is_deleted: boolean;
  deleted_at?: string;
  restorable?: boolean;
  days_remaining?: number;
};

export async function getDeletionStatus(userId: string): Promise<DeletionStatus> {
  const res = await fetch(`${API_URL}/deletion-status?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error(`Deletion status check failed: ${res.status}`);
  return res.json();
}

export async function deleteAccount(userId: string): Promise<void> {
  const res = await fetch(`${API_URL}/delete-account`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Delete failed: ${errBody}`);
  }
}

export async function restoreAccount(userId: string): Promise<void> {
  const res = await fetch(`${API_URL}/restore-account`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Restore failed: ${errBody}`);
  }
}

export type ExportedData = {
  meta: {
    exported_at: string;
    kopelai_version: string;
    user_id: string;
    email: string | null;
  };
  profile: unknown;
  conversations: unknown[];
  messages: unknown[];
  ai_generated_profile: unknown;
  insights: unknown[];
  themes: unknown[];
  counts: {
    conversations: number;
    messages: number;
    insights: number;
    themes: number;
  };
};

export async function exportData(userId: string): Promise<ExportedData> {
  const res = await fetch(`${API_URL}/export-data?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Export failed: ${errBody}`);
  }
  return res.json();
}