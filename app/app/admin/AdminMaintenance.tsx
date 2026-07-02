'use client';

import { useEffect, useState } from 'react';
import { useLang } from '@/lib/i18n';

// Admin toggle for site-wide maintenance mode. Reads/writes the runtime switch
// (Supabase app_settings) via /api/admin/maintenance. proxy.ts (edge middleware)
// picks up changes within ~10s — no redeploy needed.
export default function AdminMaintenance() {
  const { language } = useLang();
  const isHebrew = language === 'he';

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/maintenance')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setEnabled(Boolean(d.enabled)))
      .catch(() => setError(isHebrew ? 'לא הצלחנו לטעון את הסטטוס.' : 'Could not load status.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setMaintenance(next: boolean) {
    // Turning maintenance ON takes the public site down — confirm first.
    if (next) {
      const warn = isHebrew
        ? 'להפעיל מצב תחזוקה? כל המבקרים יראו את עמוד התחזוקה (חוץ ממך, דרך קישור העקיפה).'
        : 'Turn maintenance ON? Every visitor will see the maintenance page (except you, via the bypass link).';
      if (!window.confirm(warn)) return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setEnabled(Boolean(d.enabled));
    } catch {
      setError(isHebrew ? 'העדכון נכשל.' : 'Update failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
      <div className="font-semibold text-stone-900 dark:text-zinc-100 mb-1">
        {isHebrew ? 'מצב תחזוקה' : 'Maintenance mode'}
      </div>
      <p className="text-sm text-stone-500 dark:text-zinc-500 mb-4">
        {isHebrew
          ? 'כשמופעל, כל המבקרים רואים את עמוד התחזוקה (503). השינוי נכנס לתוקף תוך כ-10 שניות, בלי צורך בפריסה מחדש.'
          : 'When on, every visitor sees the maintenance page (503). Changes take effect within ~10 seconds, no redeploy needed.'}
      </p>

      {enabled === null && !error ? (
        <div className="text-sm text-stone-400 dark:text-zinc-600">{isHebrew ? 'טוען…' : 'Loading…'}</div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                enabled
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              {enabled
                ? (isHebrew ? 'תחזוקה פעילה — האתר סגור לציבור' : 'Maintenance ON — site closed to the public')
                : (isHebrew ? 'האתר חי — פתוח לכולם' : 'Site LIVE — open to everyone')}
            </span>
          </div>

          <button
            onClick={() => setMaintenance(!enabled)}
            disabled={busy}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
              enabled
                ? 'bg-emerald-700 hover:bg-emerald-600'
                : 'bg-amber-700 hover:bg-amber-600'
            }`}
          >
            {busy
              ? (isHebrew ? 'מעדכן…' : 'Updating…')
              : enabled
              ? (isHebrew ? 'כבה תחזוקה — העלה את האתר לאוויר' : 'Turn OFF — take the site live')
              : (isHebrew ? 'הפעל תחזוקה' : 'Turn ON maintenance')}
          </button>

          {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

          <p className="text-xs text-stone-400 dark:text-zinc-600 mt-4 leading-relaxed">
            {isHebrew
              ? 'קישור עקיפה (רק בשבילך, בזמן תחזוקה): '
              : 'Your bypass link (for you, during maintenance): '}
            <code dir="ltr" className="font-mono">/?bypass=Jemzd8vPMJHw</code>
          </p>
        </>
      )}
    </div>
  );
}
