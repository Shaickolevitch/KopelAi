'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/i18n';
import { getWhatsappStatus } from '@/lib/api';
import ConnectWhatsApp from '../plan/ConnectWhatsApp';

const SEEN_KEY = 'kopelai.wa_welcomed';

// Post-signup step: offer to connect WhatsApp. Auto-skips to the app if the
// user is already linked, has seen this once, or WhatsApp isn't live yet — so
// returning users (incl. Google) never get nagged.
export default function WelcomePage() {
  const router = useRouter();
  const { language } = useLang();
  const he = language === 'he';
  const [show, setShow] = useState(false);

  useEffect(() => {
    let done = false;
    const go = () => { if (!done) { done = true; router.replace('/app/conversation'); } };
    try { if (localStorage.getItem(SEEN_KEY) === '1') return go(); } catch {}
    getWhatsappStatus()
      .then((s) => { if (s.configured && !s.linked) setShow(true); else go(); })
      .catch(go);
  }, [router]);

  function done() {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch {}
    router.replace('/app/conversation');
  }

  if (!show) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 150, 300].map((d) => (
            <span key={d} className="w-2 h-2 rounded-full bg-stone-400 dark:bg-zinc-600 animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-950 dark:bg-indigo-600 flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-lg">K</span>
        </div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-zinc-100 mb-2">
          {he ? 'ברוך הבא לקופלAI' : 'Welcome to KopelAi'}
        </h1>
        <p className="text-stone-500 dark:text-zinc-400 text-[0.94rem] leading-relaxed mb-5">
          {he
            ? 'רוצה לדבר עם קופל גם בוואטסאפ? בלחיצה אחת תוכל/י לשוחח איתו גם משם - אותו זיכרון, אותו מנוי.'
            : 'Want to talk with Kopel on WhatsApp too? In one tap you can chat with him from there as well — same memory, same plan.'}
        </p>

        <div className="text-start">
          <ConnectWhatsApp />
        </div>

        <button
          onClick={done}
          className="mt-5 text-sm text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200 hover:underline"
        >
          {he ? 'אולי אחר כך, המשך לקופלAI ←' : 'Maybe later — continue to KopelAi →'}
        </button>
      </div>
    </div>
  );
}
