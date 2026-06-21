'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLang } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Convo = {
  id: string;
  started_at: string;
  summary: string | null;
  message_count: number | null;
  channel: string | null;
  analysis_generated_at: string | null;
};

function highlight(text: string, q: string) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-amber-200 dark:bg-amber-500/40 rounded px-0.5">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export default function ByConversation() {
  const { language } = useLang();
  const he = language === 'he';
  const [convos, setConvos] = useState<Convo[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [onlyAnalyzed, setOnlyAnalyzed] = useState(false);
  const [sort, setSort] = useState<'newest' | 'oldest' | 'longest' | 'shortest'>('newest');

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { setLoading(false); return; }
      const { data } = await supabase()
        .from('conversations')
        .select('id, started_at, summary, message_count, channel, analysis_generated_at')
        .eq('user_id', u.id)
        .is('deleted_at', null)
        .order('started_at', { ascending: false })
        .limit(300);
      setConvos((data ?? []) as Convo[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const fromT = from ? new Date(from + 'T00:00:00').getTime() : -Infinity;
    const toT = to ? new Date(to + 'T23:59:59').getTime() : Infinity;
    const rows = convos.filter((c) => {
      const t = new Date(c.started_at).getTime();
      if (t < fromT || t > toT) return false;
      if (onlyAnalyzed && !c.analysis_generated_at) return false;
      if (ql && !(c.summary || '').toLowerCase().includes(ql)) return false;
      return true;
    });
    const byDate = (c: Convo) => new Date(c.started_at).getTime();
    const byLen = (c: Convo) => c.message_count || 0;
    const sorted = [...rows];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'oldest': return byDate(a) - byDate(b);
        case 'longest': return byLen(b) - byLen(a);
        case 'shortest': return byLen(a) - byLen(b);
        default: return byDate(b) - byDate(a); // newest
      }
    });
    return sorted;
  }, [convos, q, from, to, onlyAnalyzed, sort]);

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString(he ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function snippet(c: Convo) {
    return c.summary && c.summary.trim().length > 0 ? c.summary : (he ? '(שיחה ללא תקציר)' : '(no summary)');
  }

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <div className="flex gap-1.5">
          {[0, 150, 300].map((d) => (
            <span key={d} className="w-2 h-2 rounded-full bg-stone-300 dark:bg-zinc-700 animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  if (convos.length === 0) {
    return (
      <div className="py-12 text-center text-stone-400 dark:text-zinc-600 text-sm">
        {he ? 'אין עדיין שיחות לניתוח. סיים שיחה כדי לראות אותה כאן.' : 'No conversations to analyze yet. Finish a session to see it here.'}
      </div>
    );
  }

  return (
    <>
      {/* Search + filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={he ? 'חיפוש בתקצירים…' : 'Search summaries…'}
          className="flex-1 min-w-[160px] px-3 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-stone-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-900/20 dark:focus:ring-indigo-500/30"
        />
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} title={he ? 'מתאריך' : 'From'}
          className="px-3 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-stone-700 dark:text-zinc-300 outline-none" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} title={he ? 'עד תאריך' : 'To'}
          className="px-3 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-stone-700 dark:text-zinc-300 outline-none" />
        {(q || from || to || onlyAnalyzed) && (
          <button onClick={() => { setQ(''); setFrom(''); setTo(''); setOnlyAnalyzed(false); }}
            className="px-3 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 text-sm text-stone-500 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800">
            {he ? 'ניקוי' : 'Clear'}
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="text-xs text-stone-400 dark:text-zinc-600">
          {he ? `${filtered.length} שיחות` : `${filtered.length} conversations`}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            aria-label={he ? 'מיון' : 'Sort'}
            className="px-2.5 py-1 rounded-full text-xs font-medium border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-stone-500 dark:text-zinc-400 outline-none hover:bg-stone-50 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <option value="newest">{he ? 'מהחדש לישן' : 'Newest first'}</option>
            <option value="oldest">{he ? 'מהישן לחדש' : 'Oldest first'}</option>
            <option value="longest">{he ? 'הארוכות ביותר' : 'Longest first'}</option>
            <option value="shortest">{he ? 'הקצרות ביותר' : 'Shortest first'}</option>
          </select>
          <button
            onClick={() => setOnlyAnalyzed((v) => !v)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
              onlyAnalyzed
                ? 'bg-clay/10 text-clay border-clay/30'
                : 'text-stone-400 dark:text-zinc-500 border-stone-200 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-800'
            }`}
          >
            {he ? 'נותחו בלבד' : 'Analyzed only'}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-stone-400 dark:text-zinc-600 text-sm">
          {he ? 'לא נמצאו תוצאות.' : 'No matches.'}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/app/insights/conversation/${c.id}`}
              className="block rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 hover:bg-stone-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-stone-900 dark:text-zinc-100">{fmtDate(c.started_at)}</span>
                <span className="flex items-center gap-2 text-xs text-stone-400 dark:text-zinc-600">
                  {c.analysis_generated_at && (
                    <span className="px-2 py-0.5 rounded-full bg-clay/10 text-clay">{he ? 'נותח' : 'analyzed'}</span>
                  )}
                  <span>{c.message_count || 0} {he ? 'הודעות' : 'msgs'}</span>
                  <span aria-hidden>{he ? '‹' : '›'}</span>
                </span>
              </div>
              <p className="text-sm text-stone-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                {highlight(snippet(c).slice(0, 180), q.trim())}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
