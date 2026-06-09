'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLang } from '@/lib/i18n';
import {
  adminListFeedback,
  adminSetFeedbackStatus,
  adminDeleteFeedback,
  type FeedbackItem,
} from '@/lib/api';

const SUBJECTS: Record<string, { he: string; en: string }> = {
  bug: { he: 'תקלה', en: 'Bug' },
  feature: { he: 'הצעה', en: 'Suggestion' },
  content: { he: 'תוכן', en: 'Content' },
  billing: { he: 'תשלום', en: 'Billing' },
  other: { he: 'אחר', en: 'Other' },
};

const SUBJECT_COLORS: Record<string, string> = {
  bug: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  feature: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
  content: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  billing: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  other: 'bg-stone-100 text-stone-600 dark:bg-zinc-800 dark:text-zinc-300',
};

export default function AdminFeedback() {
  const { language } = useLang();
  const isHebrew = language === 'he';

  const [status, setStatus] = useState<'all' | 'new' | 'in_progress' | 'resolved'>('new');
  const [subject, setSubject] = useState('all');
  const [page, setPage] = useState(0);

  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminListFeedback({ status, subject, page });
      setItems(res.items);
      setTotal(res.total);
      setPageSize(res.pageSize);
      setCounts(res.counts ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [status, subject, page]);

  useEffect(() => { load(); }, [load]);

  async function changeStatus(item: FeedbackItem, newStatus: 'new' | 'in_progress' | 'resolved') {
    setBusyId(item.id);
    try {
      await adminSetFeedbackStatus(item.id, newStatus);
      // If we're filtering by a status, the item may leave the list.
      if (status !== 'all' && newStatus !== status) {
        setItems((prev) => prev.filter((x) => x.id !== item.id));
      } else {
        setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, status: newStatus } : x)));
      }
      setCounts((c) => ({
        ...c,
        [item.status]: Math.max(0, (c[item.status] ?? 1) - 1),
        [newStatus]: (c[newStatus] ?? 0) + 1,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(item: FeedbackItem) {
    if (!window.confirm(isHebrew ? 'למחוק את המשוב הזה?' : 'Delete this feedback?')) return;
    setBusyId(item.id);
    try {
      await adminDeleteFeedback(item.id);
      setItems((prev) => prev.filter((x) => x.id !== item.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  }

  const statusTabs = [
    { key: 'new', label: isHebrew ? 'חדש' : 'New' },
    { key: 'in_progress', label: isHebrew ? 'בטיפול' : 'In progress' },
    { key: 'resolved', label: isHebrew ? 'טופל' : 'Resolved' },
    { key: 'all', label: isHebrew ? 'הכול' : 'All' },
  ] as const;

  const hasNext = (page + 1) * pageSize < total;

  return (
    <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
      <div className="font-semibold text-stone-900 dark:text-zinc-100 mb-4">{isHebrew ? 'משובים' : 'Feedback'}</div>

      {/* Status filter tabs with counts */}
      <div className="flex flex-wrap gap-2 mb-3">
        {statusTabs.map((s) => (
          <button
            key={s.key}
            onClick={() => { setStatus(s.key); setPage(0); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              status === s.key
                ? 'bg-stone-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-700'
            }`}
          >
            {s.label}
            {counts[s.key] != null && (
              <span className="ms-1.5 opacity-70">{counts[s.key]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Subject filter */}
      <select
        value={subject}
        onChange={(e) => { setSubject(e.target.value); setPage(0); }}
        className="mb-4 px-3 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-stone-900 dark:text-zinc-100 outline-none"
      >
        <option value="all">{isHebrew ? 'כל הנושאים' : 'All subjects'}</option>
        {Object.entries(SUBJECTS).map(([k, v]) => (
          <option key={k} value={k}>{isHebrew ? v.he : v.en}</option>
        ))}
      </select>

      {error && <div className="mb-3 text-sm text-rose-600 dark:text-rose-400">{error}</div>}

      {loading ? (
        <div className="py-8 text-center text-stone-400 dark:text-zinc-600">…</div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-stone-400 dark:text-zinc-600">{isHebrew ? 'אין משובים כאן' : 'No feedback here'}</div>
      ) : (
        <div className="space-y-3">
          {items.map((f) => (
            <div key={f.id} className="rounded-lg border border-stone-200 dark:border-zinc-800 p-3">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SUBJECT_COLORS[f.subject] ?? SUBJECT_COLORS.other}`}>
                  {isHebrew ? (SUBJECTS[f.subject]?.he ?? f.subject) : (SUBJECTS[f.subject]?.en ?? f.subject)}
                </span>
                <span className="font-medium text-stone-900 dark:text-zinc-100 text-sm flex-1 min-w-0 truncate">{f.headline}</span>
                <span className="text-xs text-stone-400 dark:text-zinc-600 shrink-0">
                  {new Date(f.created_at).toLocaleDateString(isHebrew ? 'he-IL' : 'en-US')}
                </span>
              </div>
              <p className="text-sm text-stone-600 dark:text-zinc-400 whitespace-pre-wrap mb-2">{f.content}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {f.email && (
                  <a href={`mailto:${f.email}`} dir="ltr" className="text-xs text-indigo-700 dark:text-indigo-400 hover:underline">
                    {f.email}
                  </a>
                )}
                <span className="flex-1" />
                <select
                  value={f.status}
                  disabled={busyId === f.id}
                  onChange={(e) => changeStatus(f, e.target.value as 'new' | 'in_progress' | 'resolved')}
                  className="px-2 py-1 rounded-md border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-stone-700 dark:text-zinc-300 outline-none disabled:opacity-50"
                >
                  <option value="new">{isHebrew ? 'חדש' : 'New'}</option>
                  <option value="in_progress">{isHebrew ? 'בטיפול' : 'In progress'}</option>
                  <option value="resolved">{isHebrew ? 'טופל' : 'Resolved'}</option>
                </select>
                <button
                  onClick={() => remove(f)}
                  disabled={busyId === f.id}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline disabled:opacity-50"
                >
                  {isHebrew ? 'מחק' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between mt-4 text-sm text-stone-500 dark:text-zinc-500">
          <span>{isHebrew ? `סה״כ ${total}` : `${total} total`}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || loading}
              className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-zinc-700 disabled:opacity-40 hover:bg-stone-50 dark:hover:bg-zinc-800">
              {isHebrew ? 'הקודם' : 'Prev'}
            </button>
            <button onClick={() => setPage((p) => p + 1)} disabled={!hasNext || loading}
              className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-zinc-700 disabled:opacity-40 hover:bg-stone-50 dark:hover:bg-zinc-800">
              {isHebrew ? 'הבא' : 'Next'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
