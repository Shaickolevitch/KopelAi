'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/i18n';
import { getConsent, setConsent } from '@/lib/consent';

// Bottom cookie/analytics consent banner. Shown only while the choice is
// undecided; hides itself once the user accepts or declines. Writing the choice
// (via setConsent) is what unlocks PostHog + Vercel Analytics in AnalyticsProvider.
export default function ConsentBanner() {
  const t = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only render after mount (avoids hydration mismatch) and only if undecided.
    if (getConsent() === null) setVisible(true);
  }, []);

  if (!visible) return null;

  function choose(v: 'granted' | 'denied') {
    setConsent(v);
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t.consent_message}
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur px-4 py-3.5 shadow-lg flex flex-col sm:flex-row sm:items-center gap-3"
    >
      <p className="text-sm text-stone-600 dark:text-zinc-300 leading-snug flex-1">
        {t.consent_message}{' '}
        <Link href="/privacy" className="underline hover:text-indigo-700 dark:hover:text-indigo-400">
          {t.consent_learn_more}
        </Link>
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => choose('denied')}
          className="px-3.5 py-2 rounded-xl text-sm font-medium text-stone-600 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
        >
          {t.consent_decline}
        </button>
        <button
          type="button"
          onClick={() => choose('granted')}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-indigo-950 dark:bg-indigo-600 text-white hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors"
        >
          {t.consent_accept}
        </button>
      </div>
    </div>
  );
}
