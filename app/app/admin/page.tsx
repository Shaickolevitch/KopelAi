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
  adminGetMonitoring,
  type KbDocument,
  type MonitoringSummary,
} from '@/lib/api';
import AdminUsers from './AdminUsers';
import AdminFeedback from './AdminFeedback';
import AdminAnalytics from './AdminAnalytics';
import AdminReviews from './AdminReviews';
import AdminMaintenance from './AdminMaintenance';
import AdminCost from './AdminCost';

// Admin-only (Shai): live-edit the system prompt + manage the knowledge base (RAG).
// TODO: replace the hard-coded admin email with a real role flag, and enforce on the server.
const ADMIN_EMAIL = 'shaigian1@gmail.com';

const KB_ALLOWED = ['.pdf', '.docx', '.txt', '.md'];
const isKbAllowed = (name: string) => KB_ALLOWED.some((ext) => name.toLowerCase().endsWith(ext));

type SortField = 'name' | 'date' | 'kind' | 'size';

function fileKind(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'PDF';
  if (lower.endsWith('.docx')) return 'Word';
  if (lower.endsWith('.txt')) return 'Text';
  if (lower.endsWith('.md')) return 'Markdown';
  return '-';
}

function formatSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Friendly names for PostHog event keys (the raw names are cryptic).
function eventLabel(event: string, isHebrew: boolean): string {
  const map: Record<string, { he: string; en: string }> = {
    '$pageview': { he: 'צפיות בעמודים', en: 'Page views' },
    '$pageleave': { he: 'יציאות מעמוד', en: 'Page leaves' },
    '$autocapture': { he: 'קליקים ואינטראקציות', en: 'Clicks & interactions' },
    '$identify': { he: 'כניסות לחשבון', en: 'Logins' },
    '$rageclick': { he: 'קליקי תסכול (לחיצות חוזרות)', en: 'Frustrated clicks' },
    'conversation_started': { he: 'שיחות שהתחילו', en: 'Conversations started' },
    'session_ended': { he: 'שיחות שהסתיימו', en: 'Sessions ended' },
    'checkout_started': { he: 'התחלות תשלום (שדרוג)', en: 'Checkouts started' },
  };
  const m = map[event];
  return m ? (isHebrew ? m.he : m.en) : event;
}

// Lightweight inline bar chart (no chart library) for the monitoring dashboard.
function MiniBars({ title, data, valueKey, color }: {
  title: string;
  data: { day: string; new_users: number; active_users: number; messages: number }[];
  valueKey: 'new_users' | 'active_users' | 'messages';
  color: string;
}) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]));
  return (
    <div className="rounded-lg border border-stone-200 dark:border-zinc-800 p-3">
      <div className="text-xs font-medium text-stone-500 dark:text-zinc-500 mb-2">{title}</div>
      <div className="flex items-end gap-1 h-24">
        {data.map((d) => (
          <div key={d.day} className="flex-1 flex flex-col items-center justify-end group" title={`${d.day}: ${d[valueKey]}`}>
            <div
              className={`w-full rounded-t ${color}`}
              style={{ height: `${(d[valueKey] / max) * 100}%`, minHeight: d[valueKey] > 0 ? '3px' : '0' }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-stone-400 dark:text-zinc-600 mt-1">
        <span>{data[0]?.day}</span>
        <span>{data[data.length - 1]?.day}</span>
      </div>
    </div>
  );
}

// Recursively read a dropped file-system entry (file or folder) into a flat list
// of supported files. Lets an admin drag a whole folder into the knowledge base.
function readEntryFiles(entry: any): Promise<File[]> {
  return new Promise((resolve) => {
    if (!entry) return resolve([]);
    if (entry.isFile) {
      entry.file(
        (file: File) => resolve(isKbAllowed(file.name) ? [file] : []),
        () => resolve([])
      );
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const collected: any[] = [];
      const readBatch = () => {
        reader.readEntries(
          (entries: any[]) => {
            if (entries.length === 0) {
              Promise.all(collected.map(readEntryFiles)).then((nested) =>
                resolve(nested.flat())
              );
            } else {
              collected.push(...entries);
              readBatch();
            }
          },
          () => resolve([])
        );
      };
      readBatch();
    } else {
      resolve([]);
    }
  });
}

async function collectFilesFromEntries(entries: any[]): Promise<File[]> {
  const lists = await Promise.all(entries.map(readEntryFiles));
  return lists.flat();
}

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
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [kbListOpen, setKbListOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [tab, setTab] = useState<'users' | 'analytics' | 'feedback' | 'reviews' | 'prompt' | 'kb' | 'monitoring' | 'maintenance' | 'cost'>('users');

  // Open a specific tab when linked from the notification bell (?tab=reviews).
  useEffect(() => {
    try {
      const t = new URLSearchParams(window.location.search).get('tab');
      if (t && ['users', 'analytics', 'feedback', 'reviews', 'prompt', 'kb', 'monitoring', 'maintenance', 'cost'].includes(t)) {
        setTab(t as typeof tab);
      }
    } catch { /* ignore */ }
  }, []);
  const [monTab, setMonTab] = useState<'behavior' | 'traffic' | 'errors' | 'data'>('data');
  const [monitoring, setMonitoring] = useState<MonitoringSummary | null>(null);
  const [monLoading, setMonLoading] = useState(false);

  // Load monitoring numbers the first time the Monitoring tab is opened.
  useEffect(() => {
    if (tab === 'monitoring' && !monitoring && !monLoading) {
      setMonLoading(true);
      adminGetMonitoring()
        .then(setMonitoring)
        .catch(() => {})
        .finally(() => setMonLoading(false));
    }
  }, [tab, monitoring, monLoading]);

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

  async function handleUpload(files: FileList | File[] | null | undefined) {
    const list = (files ? Array.from(files) : []).filter((f) => isKbAllowed(f.name));
    if (list.length === 0) {
      setKbError(isHebrew ? 'לא נמצאו קבצים נתמכים.' : 'No supported files found.');
      return;
    }
    setUploading(true);
    setKbError('');
    const failures: string[] = [];
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      setUploadProgress({ current: i + 1, total: list.length, name: file.name });
      try {
        await uploadKbFile(file);
      } catch (e) {
        failures.push(`${file.name}: ${e instanceof Error ? e.message : 'failed'}`);
      }
    }
    setUploadProgress(null);
    try {
      setDocs(await listKbDocuments());
    } catch { /* ignore refresh error */ }
    if (failures.length > 0) {
      setKbError(
        (isHebrew ? 'חלק מהקבצים נכשלו: ' : 'Some files failed: ') + failures.join('  •  ')
      );
    }
    setUploading(false);
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
      ? 'שינוי זה ישפיע על התנהגות קופלAI בשיחות הבאות. להמשיך?'
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

  const sortedDocs = [...docs].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'name':
        cmp = a.filename.localeCompare(b.filename, isHebrew ? 'he' : 'en');
        break;
      case 'date':
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'kind':
        cmp = fileKind(a.filename).localeCompare(fileKind(b.filename));
        break;
      case 'size':
        cmp = (a.file_size ?? 0) - (b.file_size ?? 0);
        break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  // External monitoring dashboards (each is a sub-tab under "Monitoring").
  const monitors = [
    {
      key: 'behavior' as const,
      tab: isHebrew ? 'התנהגות' : 'Behavior',
      title: isHebrew ? 'התנהגות משתמשים' : 'User behavior',
      desc: isHebrew
        ? 'מי עושה מה באתר - אירועים, משפכים, שימור ומסעות משתמש. דרך PostHog.'
        : 'Who does what - events, funnels, retention, and user journeys. Via PostHog.',
      url: 'https://eu.posthog.com',
      cta: 'PostHog',
    },
    {
      key: 'traffic' as const,
      tab: isHebrew ? 'תנועה וביצועים' : 'Traffic & speed',
      title: isHebrew ? 'תנועה וביצועים' : 'Traffic & performance',
      desc: isHebrew
        ? 'מבקרים, צפיות, מקורות תנועה ומהירות טעינה. דרך Vercel Analytics ו-Speed Insights.'
        : 'Visitors, page views, sources, and load speed. Via Vercel Analytics & Speed Insights.',
      url: 'https://vercel.com/shais-projects-ed0a97e4/kopel-ai/analytics',
      cta: 'Vercel',
    },
    {
      key: 'errors' as const,
      tab: isHebrew ? 'שגיאות' : 'Errors',
      title: isHebrew ? 'שגיאות וקריסות' : 'Errors & crashes',
      desc: isHebrew
        ? 'שגיאות באתר ובשרת - מתי, איפה, וכמה משתמשים נפגעו. דרך Sentry.'
        : 'Front-end and server errors - when, where, and how many users were affected. Via Sentry.',
      url: 'https://sentry.io',
      cta: 'Sentry',
    },
    {
      key: 'data' as const,
      tab: isHebrew ? 'נתונים' : 'Data',
      title: isHebrew ? 'מסד הנתונים' : 'Database',
      desc: isHebrew
        ? 'הנתונים הגולמיים - משתמשים, שיחות ומנויים. שאילתות SQL ולוגים. דרך Supabase.'
        : 'The raw data - users, conversations, and subscriptions. SQL queries & logs. Via Supabase.',
      url: 'https://supabase.com/dashboard/project/yxioeeuzhdknhpbjjzgq',
      cta: 'Supabase',
    },
  ];
  const activeMon = monitors.find((m) => m.key === monTab) ?? monitors[0];

  return (
    <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-zinc-100 mb-5">
        {isHebrew ? 'ניהול' : 'Admin'}
      </h1>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-stone-200 dark:border-zinc-800 overflow-x-auto">
        {([
          { key: 'users', label: isHebrew ? 'משתמשים' : 'Users' },
          { key: 'analytics', label: isHebrew ? 'נתונים' : 'Analytics' },
          { key: 'feedback', label: isHebrew ? 'משוב' : 'Feedback' },
          { key: 'reviews', label: isHebrew ? 'המלצות' : 'Reviews' },
          { key: 'prompt', label: isHebrew ? 'הנחיית AI' : 'AI prompt' },
          { key: 'kb', label: isHebrew ? 'בסיס ידע' : 'Knowledge base' },
          { key: 'monitoring', label: isHebrew ? 'ניטור' : 'Monitoring' },
          { key: 'cost', label: isHebrew ? 'עלות' : 'Cost' },
          { key: 'maintenance', label: isHebrew ? 'תחזוקה' : 'Maintenance' },
        ] as const).map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === tb.key
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400'
                : 'border-transparent text-stone-500 dark:text-zinc-500 hover:text-stone-800 dark:hover:text-zinc-200'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'users' && <AdminUsers />}

      {tab === 'analytics' && <AdminAnalytics />}

      {tab === 'feedback' && <AdminFeedback />}

      {tab === 'reviews' && <AdminReviews />}

      {tab === 'maintenance' && <AdminMaintenance />}

      {tab === 'cost' && <AdminCost />}

      {tab === 'prompt' && (
      <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
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
              ? 'כאן תוכל לערוך את האישיות וההנחיות של קופלAI...'
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
      )}

      {tab === 'kb' && (
      <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
        <div className="font-semibold text-stone-900 dark:text-zinc-100 mb-2">
          {isHebrew ? 'בסיס ידע' : 'Knowledge base'}
        </div>
        <p className="text-sm text-stone-500 dark:text-zinc-500 mb-4">
          {isHebrew
            ? 'העלה PDF / Word / טקסט עם חומר פסיכולוגי. המערכת לומדת מהחומר ומתבססת עליו בשיחות.'
            : 'Upload PDF / Word / text with psychological material. KopelAi learns from it and draws on it in conversations.'}
        </p>

        <label
          onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (uploading) return;
            const items = e.dataTransfer.items;
            const canTraverse =
              items && items.length > 0 && typeof (items[0] as { webkitGetAsEntry?: unknown }).webkitGetAsEntry === 'function';
            if (canTraverse) {
              // Capture entries synchronously (required during the drop event), then recurse.
              const entries = Array.from(items)
                .map((it) => (it as unknown as { webkitGetAsEntry: () => unknown }).webkitGetAsEntry())
                .filter(Boolean);
              collectFilesFromEntries(entries).then((found) => {
                if (found.length === 0) {
                  setKbError(isHebrew ? 'לא נמצאו קבצים נתמכים בתיקייה.' : 'No supported files found in that folder.');
                } else {
                  handleUpload(found);
                }
              });
            } else {
              handleUpload(e.dataTransfer.files);
            }
          }}
          className={`flex flex-col items-center justify-center gap-1.5 px-4 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors text-center ${
            dragOver
              ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
              : 'border-stone-300 dark:border-zinc-700 hover:border-stone-400 dark:hover:border-zinc-600'
          } ${uploading ? 'opacity-60 cursor-wait' : ''}`}
        >
          <input
            type="file"
            accept=".pdf,.docx,.txt,.md"
            multiple
            disabled={uploading}
            onChange={(e) => handleUpload(e.target.files)}
            className="hidden"
          />
          {uploading ? (
            <span className="text-sm font-medium text-stone-700 dark:text-zinc-300">
              {uploadProgress
                ? (isHebrew
                    ? `מעלה ${uploadProgress.current}/${uploadProgress.total}: ${uploadProgress.name}`
                    : `Uploading ${uploadProgress.current}/${uploadProgress.total}: ${uploadProgress.name}`)
                : (isHebrew ? 'מעבד…' : 'Processing…')}
            </span>
          ) : (
            <>
              <span className="text-sm font-medium text-stone-700 dark:text-zinc-300">
                {isHebrew ? 'גרור לכאן קבצים או תיקייה, או לחץ לבחירה' : 'Drag files or a folder here, or click to choose'}
              </span>
              <span className="text-xs text-stone-400 dark:text-zinc-600">
                {isHebrew ? 'כמה קבצים או תיקייה שלמה · PDF · Word · טקסט · עד 25MB לקובץ' : 'Multiple files or a whole folder · PDF · Word · text · up to 25MB each'}
              </span>
            </>
          )}
        </label>
        {kbError && (
          <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{kbError}</p>
        )}

        {/* Document list */}
        {docs.length === 0 ? (
          <div className="mt-5 text-sm text-stone-400 dark:text-zinc-600">
            {isHebrew ? 'עדיין לא הועלו קבצים.' : 'No files uploaded yet.'}
          </div>
        ) : (
          <div className="mt-5">
            <button
              onClick={() => setKbListOpen((o) => !o)}
              className="flex items-center gap-2 w-full text-start text-sm font-medium text-stone-700 dark:text-zinc-300 hover:text-stone-900 dark:hover:text-zinc-100 transition-colors"
              aria-expanded={kbListOpen}
            >
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className={`transition-transform ${kbListOpen ? 'rotate-90' : ''}`}
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
              {isHebrew ? `קבצים שהועלו (${docs.length})` : `Uploaded files (${docs.length})`}
            </button>

            {kbListOpen && (
              <>
                {/* Sort controls */}
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="text-stone-400 dark:text-zinc-600">{isHebrew ? 'מיון לפי:' : 'Sort by:'}</span>
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as SortField)}
                    className="px-2 py-1 rounded-md border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-stone-900 dark:text-zinc-100 outline-none"
                  >
                    <option value="name">{isHebrew ? 'שם' : 'Name'}</option>
                    <option value="date">{isHebrew ? 'תאריך העלאה' : 'Upload time'}</option>
                    <option value="kind">{isHebrew ? 'סוג קובץ' : 'File kind'}</option>
                    <option value="size">{isHebrew ? 'גודל' : 'Size'}</option>
                  </select>
                  <button
                    onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                    className="px-2 py-1 rounded-md border border-stone-300 dark:border-zinc-700 hover:bg-stone-50 dark:hover:bg-zinc-800 text-stone-600 dark:text-zinc-400"
                    title={isHebrew ? 'הפוך סדר' : 'Reverse order'}
                  >
                    {sortDir === 'asc' ? '↑' : '↓'}
                  </button>
                </div>

                <div className="mt-3 space-y-2 max-h-96 overflow-y-auto pe-1">
                  {sortedDocs.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between rounded-lg border border-stone-200 dark:border-zinc-800 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-stone-900 dark:text-zinc-100 truncate">
                          {d.filename}
                        </div>
                        <div className="text-xs text-stone-400 dark:text-zinc-600">
                          {fileKind(d.filename)} · {formatSize(d.file_size)} · {d.chunk_count} {isHebrew ? 'קטעים' : 'chunks'} · {new Date(d.created_at).toLocaleDateString(isHebrew ? 'he-IL' : 'en-US')}
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
              </>
            )}
          </div>
        )}
      </div>
      )}

      {tab === 'monitoring' && (
        <div>
          {/* Monitoring sub-tabs */}
          <div className="flex flex-wrap gap-2 mb-5">
            {monitors.map((m) => (
              <button
                key={m.key}
                onClick={() => setMonTab(m.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  monTab === m.key
                    ? 'bg-stone-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-700'
                }`}
              >
                {m.tab}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
            <div className="font-semibold text-lg text-stone-900 dark:text-zinc-100 mb-1">{activeMon.title}</div>
            <p className="text-sm text-stone-500 dark:text-zinc-500 leading-relaxed mb-4">{activeMon.desc}</p>

            {monLoading && (
              <p className="text-sm text-stone-400 dark:text-zinc-600 mb-4">{isHebrew ? 'טוען נתונים…' : 'Loading…'}</p>
            )}

            {/* Data - own database overview */}
            {monTab === 'data' && monitoring?.supabase && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                {[
                  { label: isHebrew ? 'משתמשים' : 'Users', value: monitoring.supabase.total_users },
                  { label: isHebrew ? 'מנויי פרו' : 'Pro', value: monitoring.supabase.pro_users },
                  { label: isHebrew ? 'נרשמו (7 ימים)' : 'New (7d)', value: monitoring.supabase.new_users_7d },
                  { label: isHebrew ? 'פעילים (7 ימים)' : 'Active (7d)', value: monitoring.supabase.active_users_7d },
                  { label: isHebrew ? 'שיחות (7 ימים)' : 'Conversations (7d)', value: monitoring.supabase.conversations_7d },
                  { label: isHebrew ? 'הודעות (7 ימים)' : 'Messages (7d)', value: monitoring.supabase.messages_7d },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-stone-200 dark:border-zinc-800 px-3 py-3 text-center">
                    <div className="text-2xl font-bold text-stone-900 dark:text-zinc-100">{s.value}</div>
                    <div className="text-xs text-stone-500 dark:text-zinc-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Data - 14-day trend charts */}
            {monTab === 'data' && monitoring?.supabase?.daily && monitoring.supabase.daily.length > 0 && (
              <div className="grid sm:grid-cols-3 gap-3 mb-5">
                <MiniBars
                  title={isHebrew ? 'הודעות ליום (14 ימים)' : 'Messages / day (14d)'}
                  data={monitoring.supabase.daily}
                  valueKey="messages"
                  color="bg-indigo-500"
                />
                <MiniBars
                  title={isHebrew ? 'משתמשים פעילים ליום' : 'Active users / day'}
                  data={monitoring.supabase.daily}
                  valueKey="active_users"
                  color="bg-emerald-500"
                />
                <MiniBars
                  title={isHebrew ? 'הרשמות ליום' : 'Signups / day'}
                  data={monitoring.supabase.daily}
                  valueKey="new_users"
                  color="bg-amber-500"
                />
              </div>
            )}

            {/* Behavior - PostHog */}
            {monTab === 'behavior' && monitoring && (
              monitoring.posthog.configured ? (
                monitoring.posthog.error ? (
                  <p className="text-sm text-rose-600 dark:text-rose-400 mb-4">PostHog: {monitoring.posthog.error}</p>
                ) : (
                  <div className="mb-5">
                    <div className="inline-block rounded-lg border border-stone-200 dark:border-zinc-800 px-4 py-3 text-center mb-3">
                      <div className="text-2xl font-bold text-stone-900 dark:text-zinc-100">{monitoring.posthog.activeUsers7d ?? 0}</div>
                      <div className="text-xs text-stone-500 dark:text-zinc-500 mt-0.5">{isHebrew ? 'משתמשים פעילים (7 ימים)' : 'Active users (7d)'}</div>
                    </div>
                    <div className="space-y-1">
                      {(monitoring.posthog.events ?? []).map((e) => (
                        <div key={e.event} className="flex justify-between items-center text-sm border-b border-stone-100 dark:border-zinc-800 py-1.5">
                          <span className="text-stone-700 dark:text-zinc-300 truncate">{eventLabel(e.event, isHebrew)}</span>
                          <span className="font-semibold text-stone-900 dark:text-zinc-100 shrink-0 ms-3">{e.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ) : !monLoading ? (
                <p className="text-sm text-amber-600 dark:text-amber-500 mb-4">
                  {isHebrew ? 'כדי לראות נתונים כאן צריך להוסיף מפתח PostHog בשרת (ראה הוראות).' : 'Add a PostHog API key on the server to show data here.'}
                </p>
              ) : null
            )}

            {/* Traffic - pageviews from PostHog */}
            {monTab === 'traffic' && monitoring && (
              monitoring.posthog.configured && !monitoring.posthog.error ? (
                <div className="mb-5">
                  <div className="inline-block rounded-lg border border-stone-200 dark:border-zinc-800 px-4 py-3 text-center mb-3">
                    <div className="text-2xl font-bold text-stone-900 dark:text-zinc-100">{monitoring.posthog.pageviews7d ?? 0}</div>
                    <div className="text-xs text-stone-500 dark:text-zinc-500 mt-0.5">{isHebrew ? 'צפיות בעמודים (7 ימים)' : 'Page views (7d)'}</div>
                  </div>
                  <div className="text-xs font-medium text-stone-500 dark:text-zinc-500 mb-1">{isHebrew ? 'עמודים מובילים' : 'Top pages'}</div>
                  <div className="space-y-1">
                    {(monitoring.posthog.topPages ?? []).map((p) => (
                      <div key={p.page} className="flex justify-between items-center text-sm border-b border-stone-100 dark:border-zinc-800 py-1.5">
                        <span className="text-stone-600 dark:text-zinc-400 font-mono text-xs truncate" dir="ltr">{p.page || '/'}</span>
                        <span className="font-semibold text-stone-900 dark:text-zinc-100 shrink-0 ms-3">{p.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : !monLoading ? (
                <p className="text-sm text-stone-500 dark:text-zinc-500 mb-4">
                  {isHebrew ? 'נתוני התנועה מגיעים מ-PostHog. למידע מפורט יותר (מקורות, מכשירים) פתחו את Vercel.' : 'Traffic data comes from PostHog. For deeper detail (sources, devices) open Vercel.'}
                </p>
              ) : null
            )}

            {/* Errors - Sentry */}
            {monTab === 'errors' && monitoring && (
              monitoring.sentry.configured ? (
                monitoring.sentry.error ? (
                  <p className="text-sm text-rose-600 dark:text-rose-400 mb-4">Sentry: {monitoring.sentry.error}</p>
                ) : (
                  <div className="mb-5">
                    <p className="text-sm text-stone-600 dark:text-zinc-400 mb-2">
                      {isHebrew ? `תקלות פתוחות: ${monitoring.sentry.openIssues ?? 0}` : `Open issues: ${monitoring.sentry.openIssues ?? 0}`}
                    </p>
                    <div className="space-y-1">
                      {(monitoring.sentry.issues ?? []).map((i, idx) => (
                        <a key={idx} href={i.permalink ?? activeMon.url} target="_blank" rel="noopener noreferrer"
                          className="flex justify-between items-center gap-3 text-sm border-b border-stone-100 dark:border-zinc-800 py-1.5 hover:bg-stone-50 dark:hover:bg-zinc-800/50">
                          <span className="text-stone-700 dark:text-zinc-300 truncate">{i.title}</span>
                          <span className="font-semibold text-rose-600 dark:text-rose-400 shrink-0">{i.count}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )
              ) : !monLoading ? (
                <p className="text-sm text-amber-600 dark:text-amber-500 mb-4">
                  {isHebrew ? 'כדי לראות שגיאות כאן צריך ליצור פרויקט Sentry ולהוסיף מפתחות בשרת.' : 'Create a Sentry project and add its keys on the server to show errors here.'}
                </p>
              ) : null
            )}

            <a
              href={activeMon.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-950 dark:bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors"
            >
              {(isHebrew ? 'פתח ' : 'Open ') + activeMon.cta}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17L17 7M17 7H8M17 7v9" />
              </svg>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
