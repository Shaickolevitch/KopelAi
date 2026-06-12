'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLang } from '@/lib/i18n';
import { getAdminNotifications, type AdminNotifications } from '@/lib/api';

export default function AdminBell() {
  const { language } = useLang();
  const he = language === 'he';
  const [n, setN] = useState<AdminNotifications | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try { setN(await getAdminNotifications()); } catch { /* ignore */ }
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 90_000);
    return () => clearInterval(t);
  }, []);

  // Close on outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const total = n ? n.feedback_new + n.reviews_pending + n.sentry_open : 0;

  const rows = [
    { key: 'feedback', tab: 'feedback', count: n?.feedback_new ?? 0, label: he ? 'משוב חדש' : 'New feedback' },
    { key: 'reviews', tab: 'reviews', count: n?.reviews_pending ?? 0, label: he ? 'המלצות לאישור' : 'Reviews to approve' },
    { key: 'sentry', tab: 'monitoring', count: n?.sentry_open ?? 0, label: he ? 'שגיאות פתוחות (Sentry)' : 'Open errors (Sentry)' },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen((v) => !v); if (!open) load(); }}
        className="relative p-2 rounded-lg text-stone-500 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-stone-800 dark:hover:text-zinc-200 transition-colors"
        aria-label={he ? 'התראות' : 'Notifications'}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {total > 0 && (
          <span className="absolute -top-0.5 -end-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-medium flex items-center justify-center">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 mt-2 w-64 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-zinc-500 border-b border-stone-100 dark:border-zinc-800">
            {he ? 'דורש תשומת לב' : 'Needs attention'}
          </div>
          {total === 0 ? (
            <div className="px-4 py-4 text-sm text-stone-400 dark:text-zinc-600 text-center">{he ? 'הכול נקי 🙂' : "You're all caught up"}</div>
          ) : (
            rows.filter((r) => r.count > 0).map((r) => (
              <Link
                key={r.key}
                href={`/app/admin?tab=${r.tab}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-4 py-3 text-sm text-stone-700 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <span>{r.label}</span>
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-indigo-950 dark:bg-indigo-600 text-white text-xs font-medium flex items-center justify-center">{r.count}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
