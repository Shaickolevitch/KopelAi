'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    en: { title: 'Conversation', body: "Talk like you'd talk to a smart friend." },
    he: { title: 'שיחה', body: 'תדבר כמו שהיית מדבר עם חבר חכם.' },
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10"/><path d="M12 8v4l3 3"/>
      </svg>
    ),
    en: { title: 'Memory', body: 'Each session, KopelAi remembers more.' },
    he: { title: 'זיכרון', body: 'כל שיחה — קופל זוכר עוד עליך.' },
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20h.01M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 4v16"/>
      </svg>
    ),
    en: { title: 'Insights', body: 'The patterns you live by, made visible.' },
    he: { title: 'תובנות', body: 'הדפוסים שלפיהם אתה חי, מוצגים מולך.' },
  },
];

export default function HomePage() {
  const { language, setLanguage } = useLang();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function check() {
      const user = await getCurrentUser();
      if (user) router.replace('/app/conversation');
      else setChecking(false);
    }
    check();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-zinc-950">
        <div className="flex gap-1.5">
          {[0, 150, 300].map((d) => (
            <span key={d} className="w-2 h-2 rounded-full bg-stone-400 dark:bg-zinc-600 animate-bounce"
              style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  const isHebrew = language === 'he';

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-zinc-950">
      {/* Top bar */}
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-950 dark:bg-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm leading-none">K</span>
          </div>
          <span className="font-semibold text-stone-900 dark:text-zinc-100">KopelAi</span>
        </div>
        <button
          onClick={() => setLanguage(isHebrew ? 'en' : 'he')}
          className="text-sm text-stone-500 dark:text-zinc-500 hover:text-stone-700 dark:hover:text-zinc-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-zinc-800"
        >
          {isHebrew ? 'English' : 'עברית'}
        </button>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-2xl w-full">
          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl font-bold text-stone-900 dark:text-zinc-100 leading-tight mb-4 tracking-tight">
            {isHebrew ? 'שיחה שמכירה אותך' : 'A conversation that knows you'}
          </h1>

          <p className="text-lg sm:text-xl text-stone-500 dark:text-zinc-400 leading-relaxed mb-14 max-w-xl">
            {isHebrew
              ? 'אפליקציה שמקשיבה, זוכרת, ועוזרת לך להבין את עצמך'
              : 'An app that listens, remembers, and helps you understand yourself'}
          </p>

          {/* Feature pills */}
          <div className="flex flex-col gap-4 mb-14">
            {FEATURES.map((feat) => {
              const copy = isHebrew ? feat.he : feat.en;
              return (
                <div key={copy.title} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 flex items-center justify-center shrink-0 text-stone-600 dark:text-zinc-400 shadow-sm">
                    {feat.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900 dark:text-zinc-100 mb-0.5">{copy.title}</div>
                    <div className="text-stone-500 dark:text-zinc-500 text-sm leading-relaxed">{copy.body}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/auth/signup"
              className="px-6 py-3 rounded-xl bg-indigo-950 dark:bg-indigo-600 text-white text-center hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors font-medium shadow-sm"
            >
              {isHebrew ? 'התחל שיחה' : 'Start a conversation'}
            </Link>
            <Link
              href="/auth/signin"
              className="px-6 py-3 rounded-xl border border-stone-300 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 text-center hover:bg-white dark:hover:bg-zinc-900 transition-colors"
            >
              {isHebrew ? 'יש לי כבר חשבון' : 'I already have an account'}
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 text-center">
        <div className="flex justify-center gap-5 text-sm text-stone-400 dark:text-zinc-600">
          <a href={isHebrew ? '/privacy-he/' : '/privacy/'} className="hover:text-stone-600 dark:hover:text-zinc-400 transition-colors">
            {isHebrew ? 'פרטיות' : 'Privacy'}
          </a>
          <span>·</span>
          <a href={isHebrew ? '/terms-he/' : '/terms/'} className="hover:text-stone-600 dark:hover:text-zinc-400 transition-colors">
            {isHebrew ? 'תנאי שימוש' : 'Terms'}
          </a>
        </div>
      </footer>
    </div>
  );
}
