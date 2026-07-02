'use client';

import { useEffect, useState } from 'react';
import { useLang } from '@/lib/i18n';
import { adminGetTokenUsage, type TokenUsageSummary } from '@/lib/api';

const usd = (n: number) => '$' + (n < 10 ? n.toFixed(2) : n.toFixed(0));
const compact = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
};
// Sonnet = the cheap default; Opus = the expensive deep model.
const modelLabel = (m: string) => {
  const s = m.toLowerCase();
  if (s.includes('opus')) return 'Opus (יקר)';
  if (s.includes('haiku')) return 'Haiku';
  if (s.includes('sonnet')) return 'Sonnet';
  return m;
};

export default function AdminCost() {
  const { language } = useLang();
  const isHebrew = language === 'he';
  const [days, setDays] = useState(30);
  const [data, setData] = useState<TokenUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    adminGetTokenUsage(days)
      .then(setData)
      .catch(() => setError(isHebrew ? 'לא הצלחנו לטעון את נתוני העלות.' : 'Could not load cost data.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const maxDaily = Math.max(1, ...(data?.daily ?? []).map((d) => d.costUsd));

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              days === d
                ? 'bg-stone-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-700'
            }`}
          >
            {isHebrew ? `${d} ימים` : `${d} days`}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-stone-400 dark:text-zinc-600">{isHebrew ? 'טוען…' : 'Loading…'}</p>}
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      {data && !loading && (
        <>
          {/* Headline numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: isHebrew ? 'עלות משוערת' : 'Est. cost', value: usd(data.totalCostUsd), big: true },
              { label: isHebrew ? 'הודעות' : 'Messages', value: compact(data.totalRequests) },
              { label: isHebrew ? 'טוקני קלט' : 'Input tokens', value: compact(data.totalInputTokens) },
              { label: isHebrew ? 'טוקני פלט' : 'Output tokens', value: compact(data.totalOutputTokens) },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-4 text-center">
                <div className={`font-bold text-stone-900 dark:text-zinc-100 ${s.big ? 'text-3xl text-emerald-600 dark:text-emerald-400' : 'text-2xl'}`}>{s.value}</div>
                <div className="text-xs text-stone-500 dark:text-zinc-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* By model */}
          <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <div className="font-semibold text-stone-900 dark:text-zinc-100 mb-3">{isHebrew ? 'לפי מודל' : 'By model'}</div>
            {data.byModel.length === 0 ? (
              <p className="text-sm text-stone-400 dark:text-zinc-600">{isHebrew ? 'אין נתונים עדיין.' : 'No data yet.'}</p>
            ) : (
              <div className="space-y-2">
                {data.byModel.map((m) => (
                  <div key={m.model} className="flex items-center justify-between text-sm border-b border-stone-100 dark:border-zinc-800 py-2 last:border-0">
                    <span className="text-stone-700 dark:text-zinc-300 font-medium">{modelLabel(m.model)}</span>
                    <span className="flex items-center gap-4 text-stone-500 dark:text-zinc-500">
                      <span>{compact(m.requests)} {isHebrew ? 'הודעות' : 'msgs'}</span>
                      <span className="font-semibold text-stone-900 dark:text-zinc-100 w-16 text-end">{usd(m.costUsd)}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Daily cost chart */}
          {data.daily.length > 0 && (
            <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
              <div className="font-semibold text-stone-900 dark:text-zinc-100 mb-3">{isHebrew ? 'עלות יומית' : 'Daily cost'}</div>
              <div className="flex items-end gap-1 h-28" dir="ltr">
                {data.daily.map((d) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center justify-end group" title={`${d.day}: ${usd(d.costUsd)} · ${d.requests} msgs`}>
                    <div className="w-full rounded-t bg-emerald-500" style={{ height: `${(d.costUsd / maxDaily) * 100}%`, minHeight: d.costUsd > 0 ? '3px' : '0' }} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-stone-400 dark:text-zinc-600 mt-1" dir="ltr">
                <span>{data.daily[0]?.day}</span>
                <span>{data.daily[data.daily.length - 1]?.day}</span>
              </div>
            </div>
          )}

          {/* Top users */}
          <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <div className="font-semibold text-stone-900 dark:text-zinc-100 mb-3">{isHebrew ? 'המשתמשים היקרים ביותר' : 'Most expensive users'}</div>
            {data.topUsers.length === 0 ? (
              <p className="text-sm text-stone-400 dark:text-zinc-600">{isHebrew ? 'אין נתונים עדיין.' : 'No data yet.'}</p>
            ) : (
              <div className="space-y-1">
                {data.topUsers.map((u) => (
                  <div key={u.user_id} className="flex items-center justify-between text-sm border-b border-stone-100 dark:border-zinc-800 py-1.5 last:border-0">
                    <span className="text-stone-700 dark:text-zinc-300 truncate" dir="ltr">{u.email ?? u.user_id.slice(0, 8) + '…'}</span>
                    <span className="flex items-center gap-4 text-stone-500 dark:text-zinc-500 shrink-0">
                      <span>{compact(u.requests)} {isHebrew ? 'הודעות' : 'msgs'}</span>
                      <span className="font-semibold text-stone-900 dark:text-zinc-100 w-16 text-end">{usd(u.costUsd)}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-stone-400 dark:text-zinc-600 leading-relaxed">
            {isHebrew
              ? 'העלות היא הערכה לפי מחירון משוער (Sonnet ~$3/$15, Opus ~$15/$75 למיליון טוקנים). לדיוק — עדכן את TOKEN_PRICES בשרת לפי המחירון שלך.'
              : 'Cost is estimated from approximate list prices (Sonnet ~$3/$15, Opus ~$15/$75 per million tokens). For precision, edit TOKEN_PRICES on the server to match your plan.'}
          </p>
        </>
      )}
    </div>
  );
}
