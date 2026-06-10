'use client';

import { useLang } from '@/lib/i18n';

const STORE_URL =
  'https://kopelel.co.il/%D7%91%D7%99%D7%9F-%D7%A9%D7%A2%D7%94-%D7%9C%D7%A9%D7%A2%D7%94-%D7%94%D7%A8%D7%A6%D7%90%D7%95%D7%AA-%D7%95%D7%95%D7%99%D7%93%D7%90%D7%95/';

export default function StorePage() {
  const { language } = useLang();
  const isHebrew = language === 'he';

  return (
    <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-zinc-100 mb-1">
        {isHebrew ? 'הרצאות' : 'Lectures'}
      </h1>
      <p className="text-stone-500 dark:text-zinc-400 mb-8">
        {isHebrew
          ? '"בין שעה לשעה" - הרצאות וידאו קצרות על מושגי יסוד בפסיכואנליזה, מאת קופלAI אליעזר.'
          : '"Between Hour and Hour" - short video lectures on core psychoanalytic concepts, by Kopel Eliezer.'}
      </p>

      <div className="rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mx-auto mb-4">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400 dark:text-indigo-500">
            <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /><polygon points="10 8 15 10.5 10 13 10 8" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-zinc-100 mb-1">
          {isHebrew ? '77 מושגים בפסיכואנליזה' : '77 concepts in psychoanalysis'}
        </h2>
        <p className="text-sm text-stone-500 dark:text-zinc-500 max-w-md mx-auto mb-6">
          {isHebrew
            ? 'כל הרצאה מתמקדת במושג יסוד אחד. ניתן לצפות ולרכוש הרצאות בודדות (₪50 להרצאה) באתר של קופלAI אליעזר.'
            : 'Each lecture focuses on one core concept. Browse and buy individual lectures (₪50 each) on Kopel Eliezer\'s site.'}
        </p>
        <a
          href={STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-6 py-3 rounded-xl bg-indigo-950 dark:bg-indigo-600 text-white font-medium hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors"
        >
          {isHebrew ? 'לצפייה ולרכישה בחנות ←' : 'Browse & buy in the store →'}
        </a>
        <p className="text-xs text-stone-400 dark:text-zinc-600 mt-3">
          {isHebrew ? 'נפתח באתר חיצוני (kopelel.co.il)' : 'Opens on the external site (kopelel.co.il)'}
        </p>
      </div>
    </div>
  );
}
