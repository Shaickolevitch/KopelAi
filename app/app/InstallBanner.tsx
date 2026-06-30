'use client';

import { useEffect, useState } from 'react';
import { useLang } from '@/lib/i18n';
import { usePwaInstall, installGuide } from '@/lib/pwa';

const DISMISS_KEY = 'kopelai.installBannerDismissed';

// Reusable instructions block (used by the banner and the Plan page).
export function InstallInstructions({ className = '' }: { className?: string }) {
  const { language } = useLang();
  const he = language === 'he';
  const { platform, canPrompt, promptInstall } = usePwaInstall();
  const guide = installGuide(platform, canPrompt, he);

  return (
    <div className={className}>
      <p className="font-medium text-stone-800 dark:text-zinc-200 mb-2">{guide.headline}</p>
      <ol className="space-y-1.5 text-sm text-stone-600 dark:text-zinc-400">
        {guide.steps.map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-stone-200 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 text-xs flex items-center justify-center font-semibold">{i + 1}</span>
            <span className="leading-relaxed">{s}</span>
          </li>
        ))}
      </ol>
      {canPrompt && (
        <button
          onClick={() => promptInstall()}
          className="mt-3 px-4 py-2 rounded-lg bg-indigo-950 dark:bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors"
        >
          {he ? 'התקנה' : 'Install'}
        </button>
      )}
    </div>
  );
}

// Floating top banner: shows once until installed or dismissed. Hidden when the
// app is already running standalone (i.e. already installed).
export default function InstallBanner() {
  const { language } = useLang();
  const he = language === 'he';
  const { platform, canPrompt, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(true); // start hidden until we check
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try { setDismissed(localStorage.getItem(DISMISS_KEY) === '1'); }
    catch { setDismissed(false); }
  }, []);

  function close() {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
  }

  // Don't show if: still loading platform, already installed, or dismissed.
  if (!platform || platform.isStandalone || dismissed) return null;

  const guide = installGuide(platform, canPrompt, he);

  return (
    <div className="bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900">
      <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center gap-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-700 dark:text-indigo-300 flex-shrink-0">
          <rect x="5" y="2" width="14" height="20" rx="2" /><path d="M12 18h.01" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-stone-800 dark:text-zinc-200 truncate">
            {he ? 'התקינו את קופלAI כאפליקציה — גישה מהירה, כמו אפליקציה אמיתית.' : 'Install KopelAi as an app — quick access, just like a real app.'}
          </p>
        </div>
        {canPrompt ? (
          <button onClick={() => promptInstall()} className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-indigo-950 dark:bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors">
            {he ? 'התקנה' : 'Install'}
          </button>
        ) : (
          <button onClick={() => setOpen((v) => !v)} className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
            {he ? 'איך?' : 'How?'}
          </button>
        )}
        <button onClick={close} aria-label={he ? 'סגירה' : 'Dismiss'} className="flex-shrink-0 p-1 rounded-md text-stone-400 hover:text-stone-700 dark:text-zinc-500 dark:hover:text-zinc-300">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>

      {open && !canPrompt && (
        <div className="max-w-3xl mx-auto px-4 pb-3">
          <div className="rounded-lg bg-white dark:bg-zinc-900 border border-indigo-100 dark:border-indigo-900 p-3">
            <ol className="space-y-1.5 text-sm text-stone-600 dark:text-zinc-400">
              {guide.steps.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-stone-200 dark:bg-zinc-800 text-xs flex items-center justify-center font-semibold">{i + 1}</span>
                  <span className="leading-relaxed">{s}</span>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-stone-400 dark:text-zinc-600">
              {he ? 'אפשר תמיד למצוא את ההסבר שוב בעמוד "מנוי".' : 'You can always find this again on the "Plan" page.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
