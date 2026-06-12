'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLang } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';
import { submitReview } from '@/lib/api';

function Stars({ value, hover, onPick, onHover }: { value: number; hover: number; onPick: (n: number) => void; onHover: (n: number) => void }) {
  return (
    <div className="flex gap-1.5" onMouseLeave={() => onHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = (hover || value) >= n;
        return (
          <button key={n} type="button" onClick={() => onPick(n)} onMouseEnter={() => onHover(n)} className="transition-transform hover:scale-110" aria-label={`${n}`}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill={filled ? '#f59e0b' : 'none'} stroke={filled ? '#f59e0b' : 'currentColor'} strokeWidth="1.5" className={filled ? '' : 'text-stone-300 dark:text-zinc-600'}>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

export default function ReviewPage() {
  const { language } = useLang();
  const he = language === 'he';

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [content, setContent] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCurrentUser().then((u) => { if (u?.email) setName(u.email.split('@')[0]); });
  }, []);

  async function submit() {
    if (rating < 1) { setError(he ? 'בחרו דירוג בכוכבים' : 'Pick a star rating'); return; }
    if (!content.trim()) { setError(he ? 'כתבו כמה מילים' : 'Write a few words'); return; }
    setBusy(true); setError('');
    try {
      await submitReview(rating, content.trim(), name.trim() || undefined);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : (he ? 'משהו השתבש' : 'Something went wrong'));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md text-center">
          <div className="text-4xl mb-3">🙏</div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-zinc-100 mb-2">{he ? 'תודה על השיתוף!' : 'Thank you for sharing!'}</h1>
          <p className="text-stone-500 dark:text-zinc-400 text-sm leading-relaxed mb-5">
            {he ? 'ההמלצה התקבלה ותופיע באתר לאחר אישור קצר.' : 'Your review was received and will appear on the site after a quick approval.'}
          </p>
          <Link href="/app/conversation" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
            {he ? 'חזרה לקופלAI ←' : 'Back to KopelAi →'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-zinc-100 mb-1">{he ? 'לכתוב המלצה' : 'Leave a review'}</h1>
        <p className="text-stone-500 dark:text-zinc-400 text-sm mb-6">
          {he ? 'החוויה שלך עוזרת למטפלים אחרים להחליט. תודה שאתם משתפים.' : 'Your experience helps other therapists decide. Thanks for sharing.'}
        </p>

        <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm space-y-4">
          <div>
            <label className="block text-sm text-stone-600 dark:text-zinc-400 mb-2">{he ? 'דירוג' : 'Rating'}</label>
            <Stars value={rating} hover={hover} onPick={setRating} onHover={setHover} />
          </div>

          <div>
            <label className="block text-sm text-stone-600 dark:text-zinc-400 mb-1">{he ? 'השם שיוצג' : 'Display name'}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder={he ? 'איך להציג אותך' : 'How to show your name'}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-stone-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-900/20 dark:focus:ring-indigo-500/30"
            />
          </div>

          <div>
            <label className="block text-sm text-stone-600 dark:text-zinc-400 mb-1">{he ? 'ההמלצה' : 'Your review'}</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={1000}
              rows={5}
              placeholder={he ? 'מה החוויה שלך עם קופלAI?' : 'What was your experience with KopelAi?'}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-stone-900 dark:text-zinc-100 outline-none resize-y focus:ring-2 focus:ring-indigo-900/20 dark:focus:ring-indigo-500/30"
            />
          </div>

          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

          <button
            onClick={submit}
            disabled={busy}
            className="w-full py-2.5 rounded-xl bg-indigo-950 dark:bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors disabled:opacity-60"
          >
            {busy ? (he ? 'שולח…' : 'Submitting…') : (he ? 'שליחת המלצה' : 'Submit review')}
          </button>
          <p className="text-xs text-stone-400 dark:text-zinc-600 text-center">
            {he ? 'ההמלצה תופיע באתר לאחר אישור.' : 'Your review appears on the site after approval.'}
          </p>
        </div>
      </div>
    </div>
  );
}
