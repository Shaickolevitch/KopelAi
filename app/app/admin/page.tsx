'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';
import {
  getSystemPrompt,
  saveSystemPrompt,
  listKbDocuments,
  uploadKbFile,
  deleteKbDocument,
  type KbDocument,
} from '@/lib/api';
import AdminUsers from './AdminUsers';

// Admin-only (Shai): live-edit the system prompt + manage the knowledge base (RAG).
// TODO: replace the hard-coded admin email with a real role flag, and enforce on the server.
const ADMIN_EMAIL = 'shaigian1@gmail.com';

export default function AdminPage() {
  const { language } = useLang();
  const isHebrew = language === 'he';
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  // System prompt editor state
  const [prompt, setPrompt] = useState('');
  const [promptLoading, setPromptLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Knowledge base state
  const [docs, setDocs] = useState<KbDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [kbError, setKbError] = useState('');

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u || u.email !== ADMIN_EMAIL) {
        router.replace('/app/conversation');
      } else {
        setAllowed(true);
        getSystemPrompt()
          .then((p) => setPrompt(p))
          .catch(() => setSaveError('Could not load the current prompt.'))
          .finally(() => setPromptLoading(false));
        listKbDocuments().then(setDocs).catch(() => {});
      }
    });
  }, [router]);

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setKbError('');
    try {
      await uploadKbFile(file);
      setDocs(await listKbDocuments());
    } catch (e) {
      setKbError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteDoc(id: string) {
    try {
      await deleteKbDocument(id);
      setDocs((d) => d.filter((x) => x.id !== id));
    } catch (e) {
      setKbError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  async function handleSavePrompt() {
    const warn = isHebrew
      ? 'שינוי זה ישפיע על התנהגות קופל בשיחות הבאות. להמשיך?'
      : "This will change KopelAi's behavior in future conversations. Continue?";
    if (!window.confirm(warn)) return;
    setSaving(true);
    setSaved(false);
    setSaveError('');
    try {
      await saveSystemPrompt(prompt);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!allowed) return null;

  return (
    <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-zinc-100 mb-1">
        {isHebrew ? 'ניהול' : 'Admin'}
      </h1>
      <p className="text-stone-500 dark:text-zinc-400 mb-8">
        {isHebrew
          ? 'עריכת ההנחיה של ה-AI וטעינת חומרי ידע שהמערכת תלמד מהם.'
          : "Edit the AI's prompt and load knowledge material the system learns from."}
      </p>

      {/* System prompt editor (placeholder) */}
      <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm mb-5">
        <div className="font-semibold text-stone-900 dark:text-zinc-100 mb-2">
          {isHebrew ? 'הנחיית המערכת (System Prompt)' : 'System prompt'}
        </div>
        <textarea
          value={promptLoading ? '' : prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={promptLoading || saving}
          rows={16}
          dir="ltr"
          placeholder={
            promptLoading
              ? isHebrew ? 'טוען...' : 'Loading...'
              : isHebrew
              ? 'כאן תוכל לערוך את האישיות וההנחיות של קופל...'
              : "Edit KopelAi's persona and instructions here..."
          }
          className="w-full rounded-lg border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-950 p-3 text-sm text-stone-700 dark:text-zinc-300 resize-y font-mono leading-relaxed text-left"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={handleSavePrompt}
            disabled={promptLoading || saving || prompt.trim().length === 0}
            className="px-4 py-2 rounded-lg bg-indigo-950 dark:bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? (isHebrew ? 'שומר...' : 'Saving...') : isHebrew ? 'שמור' : 'Save'}
          </button>
          {saved && (
            <span className="text-sm text-emerald-600 dark:text-emerald-400">
              {isHebrew ? 'נשמר ✓' : 'Saved ✓'}
            </span>
          )}
          {saveError && (
            <span className="text-sm text-rose-600 dark:text-rose-400">{saveError}</span>
          )}
        </div>
        <p className="text-xs text-stone-400 dark:text-zinc-600 mt-2">
          {isHebrew
            ? 'השינוי ייכנס לתוקף בשיחה הבאה. ריק = חזרה להנחיה המובנית.'
            : 'Takes effect on the next conversation. Empty = revert to the built-in prompt.'}
        </p>
      </div>

      {/* Knowledge base */}
      <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
        <div className="font-semibold text-stone-900 dark:text-zinc-100 mb-2">
          {isHebrew ? 'בסיס ידע' : 'Knowledge base'}
        </div>
        <p className="text-sm text-stone-500 dark:text-zinc-500 mb-4">
          {isHebrew
            ? 'העלה PDF / Word / טקסט עם חומר פסיכולוגי. המערכת לומדת מהחומר ומתבססת עליו בשיחות.'
            : 'Upload PDF / Word / text with psychological material. KopelAi learns from it and draws on it in conversations.'}
        </p>

        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-950 dark:bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors cursor-pointer disabled:opacity-60">
          <input
            type="file"
            accept=".pdf,.docx,.txt,.md"
            disabled={uploading}
            onChange={(e) => handleUpload(e.target.files?.[0])}
            className="hidden"
          />
          {uploading
            ? isHebrew ? 'מעלה ומעבד…' : 'Uploading & processing…'
            : isHebrew ? 'העלה קובץ' : 'Upload a file'}
        </label>
        <span className="ms-3 text-xs text-stone-400 dark:text-zinc-600">
          {isHebrew ? 'PDF · Word · טקסט · עד 25MB' : 'PDF · Word · text · up to 25MB'}
        </span>
        {kbError && (
          <span className="ms-3 text-sm text-rose-600 dark:text-rose-400">{kbError}</span>
        )}

        {/* Document list */}
        <div className="mt-5 space-y-2">
          {docs.length === 0 && (
            <div className="text-sm text-stone-400 dark:text-zinc-600">
              {isHebrew ? 'עדיין לא הועלו קבצים.' : 'No files uploaded yet.'}
            </div>
          )}
          {docs.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-lg border border-stone-200 dark:border-zinc-800 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-stone-900 dark:text-zinc-100 truncate">
                  {d.filename}
                </div>
                <div className="text-xs text-stone-400 dark:text-zinc-600">
                  {d.chunk_count} {isHebrew ? 'קטעים' : 'chunks'}
                </div>
              </div>
              <button
                onClick={() => handleDeleteDoc(d.id)}
                className="text-sm text-rose-600 dark:text-rose-400 hover:underline shrink-0 ms-3"
              >
                {isHebrew ? 'מחק' : 'Delete'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <AdminUsers />
      </div>
    </div>
  );
}
