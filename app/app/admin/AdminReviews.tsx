'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLang } from '@/lib/i18n';
import { adminListReviews, adminSetReviewStatus, adminDeleteReview, type AdminReview } from '@/lib/api';

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500 text-sm tracking-tight" aria-label={`${rating}/5`}>
      {'★'.repeat(rating)}<span className="text-stone-300 dark:text-zinc-700">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

export default function AdminReviews() {
  const { language } = useLang();
  const he = language === 'he';
  const [status, setStatus] = useState<'all' | 'pending' | 'approved' | 'hidden'>('pending');
  const [items, setItems] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const r = await adminListReviews(status); setItems(r.reviews); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  async function setReviewStatus(r: AdminReview, s: 'approved' | 'hidden' | 'pending') {
    setBusyId(r.id); setError('');
    try { await adminSetReviewStatus(r.id, s); setItems((prev) => prev.map((x) => x.id === r.id ? { ...x, status: s } : x)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Update failed'); }
    finally { setBusyId(null); }
  }

  async function remove(r: AdminReview) {
    if (!window.confirm(he ? 'למחוק את ההמלצה?' : 'Delete this review?')) return;
    setBusyId(r.id); setError('');
    try { await adminDeleteReview(r.id); setItems((prev) => prev.filter((x) => x.id !== r.id)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Delete failed'); }
    finally { setBusyId(null); }
  }

  const statusLabel = (s: string) =>
    s === 'approved' ? (he ? 'מאושר' : 'Approved') : s === 'hidden' ? (he ? 'מוסתר' : 'Hidden') : (he ? 'ממתין' : 'Pending');

  return (
    <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
      <div className="font-semibold text-stone-900 dark:text-zinc-100 mb-1">{he ? 'המלצות' : 'Reviews'}</div>
      <p className="text-sm text-stone-500 dark:text-zinc-500 mb-4">{he ? 'אישור המלצות לפני שהן מופיעות באתר.' : 'Approve reviews before they appear on the site.'}</p>

      <div className="flex gap-2 mb-4">
        {(['pending', 'approved', 'hidden', 'all'] as const).map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-lg text-sm ${status === s ? 'bg-indigo-950 dark:bg-indigo-600 text-white' : 'border border-stone-300 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800'}`}>
            {s === 'all' ? (he ? 'הכל' : 'All') : statusLabel(s)}
          </button>
        ))}
      </div>

      {error && <div className="mb-3 text-sm text-rose-600 dark:text-rose-400">{error}</div>}

      {loading ? (
        <div className="py-6 text-center text-stone-400 dark:text-zinc-600">…</div>
      ) : items.length === 0 ? (
        <div className="py-6 text-center text-stone-400 dark:text-zinc-600">{he ? 'אין המלצות בקטגוריה זו' : 'No reviews here'}</div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r.id} className="rounded-lg border border-stone-200 dark:border-zinc-800 p-4">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <Stars rating={r.rating} />
                  <span className="text-sm font-medium text-stone-700 dark:text-zinc-300">{r.display_name}</span>
                </div>
                <span className="text-xs text-stone-400 dark:text-zinc-600">{statusLabel(r.status)} · {new Date(r.created_at).toLocaleDateString(he ? 'he-IL' : 'en-US')}</span>
              </div>
              <p className="text-sm text-stone-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{r.content}</p>
              <div className="flex gap-3 mt-3 text-xs">
                {r.status !== 'approved' && (
                  <button disabled={busyId === r.id} onClick={() => setReviewStatus(r, 'approved')} className="text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50">{he ? 'אישור' : 'Approve'}</button>
                )}
                {r.status !== 'hidden' && (
                  <button disabled={busyId === r.id} onClick={() => setReviewStatus(r, 'hidden')} className="text-stone-500 dark:text-zinc-400 hover:underline disabled:opacity-50">{he ? 'הסתרה' : 'Hide'}</button>
                )}
                <button disabled={busyId === r.id} onClick={() => remove(r)} className="text-rose-600 dark:text-rose-400 hover:underline disabled:opacity-50">{he ? 'מחיקה' : 'Delete'}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
