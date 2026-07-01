'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLang } from '@/lib/i18n';
import { getPublicReviews, type PublicReview } from '@/lib/api';

function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = rating >= n;
        return (
          <svg key={n} width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#f59e0b' : 'none'} stroke={filled ? '#f59e0b' : 'currentColor'} strokeWidth="1.5" className={filled ? '' : 'text-stone-300 dark:text-zinc-600'}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        );
      })}
    </div>
  );
}

export default function Testimonials() {
  const { language } = useLang();
  const he = language === 'he';
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getPublicReviews()
      .then((d) => { setReviews(d.reviews); setAverage(d.average); setCount(d.count); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  return (
    <section className="px-5 py-16 bg-white dark:bg-zinc-900 border-y border-stone-200 dark:border-zinc-800">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-zinc-100">
            {he ? 'מה אומרים עלינו' : 'What people say'}
          </h2>
          {count > 0 && (
            <div className="mt-2 flex items-center justify-center gap-2 text-sm text-stone-500 dark:text-zinc-400">
              <StarRow rating={Math.round(average)} />
              <span>{average.toFixed(1)} · {he ? `${count} המלצות` : `${count} reviews`}</span>
            </div>
          )}
        </div>

        {reviews.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {reviews.slice(0, 6).map((r) => (
              <div key={r.id} className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50/60 dark:bg-zinc-950/40 p-5">
                <StarRow rating={r.rating} />
                <p className="mt-2.5 text-[0.94rem] text-stone-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{r.content}</p>
                <div className="mt-3 text-sm font-medium text-stone-500 dark:text-zinc-500">— {r.display_name}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-stone-500 dark:text-zinc-400">
            {he ? 'עדיין אין המלצות - היו הראשונים לשתף.' : 'No reviews yet — be the first to share.'}
          </p>
        )}

        <div className="text-center mt-8">
          <Link
            href="/app/review"
            className="inline-block px-5 py-2.5 rounded-xl border border-stone-300 dark:border-zinc-700 text-sm font-medium text-stone-700 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors"
          >
            {he ? 'לכתוב המלצה' : 'Leave a review'}
          </Link>
          <p className="mt-2 text-xs text-stone-400 dark:text-zinc-600">
            {he ? 'כדי לשמור על אמינות, אפשר להמליץ רק לאחר התחברות.' : 'To keep it trustworthy, reviews require signing in.'}
          </p>
        </div>
      </div>
    </section>
  );
}
