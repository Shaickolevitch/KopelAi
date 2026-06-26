'use client';

import { useEffect, useRef, useState } from 'react';
import { useLang } from '@/lib/i18n';

type Settings = {
  font: number; // 0..3 → 100/112/125/140%
  contrast: boolean;
  links: boolean;
  spacing: boolean;
  cursor: boolean;
  motion: boolean; // pause animations
  guide: boolean; // reading guide
};

const DEFAULTS: Settings = { font: 0, contrast: false, links: false, spacing: false, cursor: false, motion: false, guide: false };
const FONT_STEPS = ['100%', '112%', '125%', '140%'];
const STORAGE_KEY = 'kopelai.a11y';

function apply(s: Settings) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.style.fontSize = FONT_STEPS[s.font] ?? '100%';
  html.classList.toggle('a11y-bigcursor', s.cursor);
  html.classList.toggle('a11y-no-motion', s.motion);
  const content = document.getElementById('a11y-content');
  if (content) {
    content.classList.toggle('a11y-contrast', s.contrast);
    content.classList.toggle('a11y-links', s.links);
    content.classList.toggle('a11y-spacing', s.spacing);
  }
}

export default function AccessibilityWidget() {
  const { language } = useLang();
  const he = language === 'he';
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<Settings>(DEFAULTS);
  const guideRef = useRef<HTMLDivElement | null>(null);

  // Load saved prefs once.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = { ...DEFAULTS, ...JSON.parse(raw) };
        setS(parsed);
        apply(parsed);
      }
    } catch {}
  }, []);

  // Persist + apply on change.
  function update(next: Partial<Settings>) {
    setS((prev) => {
      const merged = { ...prev, ...next };
      apply(merged);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
      return merged;
    });
  }

  function reset() {
    apply(DEFAULTS);
    setS(DEFAULTS);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  // Reading guide — a bar that follows the pointer.
  useEffect(() => {
    if (!s.guide) {
      guideRef.current?.remove();
      guideRef.current = null;
      return;
    }
    const bar = document.createElement('div');
    bar.className = 'a11y-reading-guide';
    document.body.appendChild(bar);
    guideRef.current = bar;
    const move = (e: MouseEvent) => { bar.style.top = `${e.clientY - 20}px`; };
    window.addEventListener('mousemove', move);
    return () => { window.removeEventListener('mousemove', move); bar.remove(); };
  }, [s.guide]);

  const Toggle = ({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors text-start ${
        on
          ? 'bg-indigo-950 dark:bg-indigo-600 text-white border-indigo-950 dark:border-indigo-600'
          : 'bg-white dark:bg-zinc-900 text-stone-700 dark:text-zinc-300 border-stone-200 dark:border-zinc-700 hover:bg-stone-50 dark:hover:bg-zinc-800'
      }`}
    >
      <span>{label}</span>
      <span className="text-xs opacity-70">{on ? (he ? 'פעיל' : 'On') : (he ? 'כבוי' : 'Off')}</span>
    </button>
  );

  return (
    <>
      {/* Floating button — opposite corner from the feedback button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={he ? 'תפריט נגישות' : 'Accessibility menu'}
        aria-expanded={open}
        className="fixed z-[9999] bottom-4 start-4 w-12 h-12 rounded-full bg-indigo-950 dark:bg-indigo-600 text-white shadow-lg flex items-center justify-center hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors focus:outline-none focus:ring-4 focus:ring-indigo-900/20"
      >
        {/* Universal accessibility icon */}
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="3.5" r="1.8" />
          <path d="M12 6.5c-2.3 1.2-4.6 1.7-7 1.8a1 1 0 0 0 .1 2c1.9-.1 3.7-.4 5.4-1.1l-.5 4.1-2.2 5.4a1 1 0 0 0 1.85.76L12 14.8l1.9 4.46a1 1 0 0 0 1.85-.76l-2.2-5.4-.5-4.1c1.7.7 3.5 1 5.4 1.1a1 1 0 0 0 .1-2c-2.4-.1-4.7-.6-7-1.8z" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={he ? 'אפשרויות נגישות' : 'Accessibility options'}
          className="fixed z-[9999] bottom-20 start-4 w-72 max-w-[calc(100vw-2rem)] max-h-[75vh] overflow-y-auto rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl p-3"
        >
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">{he ? 'נגישות' : 'Accessibility'}</h2>
            <button onClick={() => setOpen(false)} aria-label={he ? 'סגור' : 'Close'} className="text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 text-lg leading-none px-1">×</button>
          </div>

          {/* Font size */}
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-stone-200 dark:border-zinc-700 mb-2">
            <span className="text-sm font-medium text-stone-700 dark:text-zinc-300">{he ? 'גודל טקסט' : 'Text size'}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => update({ font: Math.max(0, s.font - 1) })} aria-label={he ? 'הקטן טקסט' : 'Decrease text'} className="w-7 h-7 rounded-lg border border-stone-300 dark:border-zinc-600 text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800">A−</button>
              <span className="text-xs tabular-nums w-6 text-center text-stone-500 dark:text-zinc-400">{s.font}</span>
              <button onClick={() => update({ font: Math.min(3, s.font + 1) })} aria-label={he ? 'הגדל טקסט' : 'Increase text'} className="w-7 h-7 rounded-lg border border-stone-300 dark:border-zinc-600 text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 text-base">A+</button>
            </div>
          </div>

          <div className="space-y-2">
            <Toggle on={s.contrast} label={he ? 'ניגודיות גבוהה' : 'High contrast'} onClick={() => update({ contrast: !s.contrast })} />
            <Toggle on={s.links} label={he ? 'הדגשת קישורים' : 'Highlight links'} onClick={() => update({ links: !s.links })} />
            <Toggle on={s.spacing} label={he ? 'ריווח קריא' : 'Readable spacing'} onClick={() => update({ spacing: !s.spacing })} />
            <Toggle on={s.cursor} label={he ? 'סמן גדול' : 'Big cursor'} onClick={() => update({ cursor: !s.cursor })} />
            <Toggle on={s.guide} label={he ? 'מדריך קריאה' : 'Reading guide'} onClick={() => update({ guide: !s.guide })} />
            <Toggle on={s.motion} label={he ? 'עצירת אנימציות' : 'Pause animations'} onClick={() => update({ motion: !s.motion })} />
          </div>

          <button onClick={reset} className="w-full mt-3 px-3 py-2 rounded-xl text-sm text-stone-500 dark:text-zinc-400 border border-stone-200 dark:border-zinc-700 hover:bg-stone-50 dark:hover:bg-zinc-800">
            {he ? 'איפוס' : 'Reset'}
          </button>

          <a href="/accessibility" className="block text-center mt-2 text-xs text-indigo-700 dark:text-indigo-400 hover:underline">
            {he ? 'הצהרת נגישות' : 'Accessibility statement'}
          </a>
        </div>
      )}
    </>
  );
}
