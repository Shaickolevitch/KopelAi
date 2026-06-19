'use client';

import { useEffect, useState } from 'react';
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

export default function ByConversation() {
  const { language } = useLang();
  const he = language === 'he';
  const [convos, setConvos] = useState<Convo[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className="text-xs text-stone-400 dark:text-zinc-600 mb-3">
        {he ? `${convos.length} שיחות` : `${convos.length} conversations`}
      </div>
      <div className="space-y-2.5">
        {convos.map((c) => (
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
              {snippet(c).slice(0, 180)}
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}
