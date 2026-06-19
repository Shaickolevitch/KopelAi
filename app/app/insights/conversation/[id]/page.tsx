'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLang } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { getConversationAnalysis, ProRequiredError, type ConversationAnalysis } from '@/lib/api';

type Status = 'loading' | 'ready' | 'pro' | 'error';

export default function ConversationAnalysisPage() {
  const { language } = useLang();
  const he = language === 'he';
  const params = useParams();
  const id = (Array.isArray(params.id) ? params.id[0] : params.id) as string;

  const [analysis, setAnalysis] = useState<ConversationAnalysis | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await getCurrentUser();
      if (!u || !id) { setStatus('error'); setErrMsg(he ? 'לא נמצאה שיחה.' : 'Conversation not found.'); return; }
      // Conversation date for the header (best-effort).
      supabase().from('conversations').select('started_at').eq('id', id).maybeSingle()
        .then(({ data }: { data: { started_at?: string } | null }) => {
          if (!cancelled && data?.started_at) setStartedAt(data.started_at);
        });
      try {
        const a = await getConversationAnalysis(id);
        if (cancelled) return;
        setAnalysis(a);
        setStatus('ready');
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ProRequiredError) { setStatus('pro'); return; }
        setStatus('error');
        setErrMsg(e instanceof Error ? e.message : (he ? 'אירעה שגיאה.' : 'Something went wrong.'));
      }
    })();
    return () => { cancelled = true; };
  }, [id, he]);

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(he ? 'he-IL' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  const refKindLabel = (k?: string) =>
    k === 'lecture' ? (he ? 'הרצאה' : 'Lecture')
    : k === 'book' ? (he ? 'ספר' : 'Book')
    : (he ? 'מושג' : 'Concept');

  return (
    <div className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-6">
      <Link href="/app/insights" className="inline-block text-sm text-stone-400 dark:text-zinc-500 hover:text-stone-700 dark:hover:text-zinc-300 mb-4">
        {he ? '→ חזרה לניתוח' : '← Back to analysis'}
      </Link>

      <h1 className="text-2xl font-semibold text-stone-900 dark:text-zinc-100 mb-1">
        {he ? 'ניתוח השיחה' : 'Conversation analysis'}
      </h1>
      {startedAt && <p className="text-sm text-stone-400 dark:text-zinc-500 mb-6">{fmtDate(startedAt)}</p>}

      {status === 'loading' && (
        <div className="py-16 text-center">
          <div className="flex justify-center gap-1.5 mb-4">
            {[0, 150, 300].map((d) => (
              <span key={d} className="w-2 h-2 rounded-full bg-stone-300 dark:bg-zinc-700 animate-bounce" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
          <p className="text-sm text-stone-400 dark:text-zinc-500">
            {he ? 'מנתח את השיחה… זה עשוי לקחת רגע.' : 'Analyzing this conversation… this can take a moment.'}
          </p>
        </div>
      )}

      {status === 'pro' && (
        <div className="rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-zinc-100 mb-1">{he ? 'אפשרות זו פתוחה למשתמשי פרו' : 'This is a Pro feature'}</h2>
          <p className="text-sm text-stone-500 dark:text-zinc-400 mb-4">{he ? 'ניתוח לעומק של כל שיחה זמין בתוכנית פרו.' : 'Deep per-conversation analysis is available on Pro.'}</p>
          <Link href="/app/plan" className="inline-block px-5 py-2.5 rounded-xl bg-indigo-950 dark:bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors">
            {he ? 'שדרג לפרו' : 'Upgrade to Pro'}
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div className="py-10 text-center text-sm text-stone-500 dark:text-zinc-400">{errMsg}</div>
      )}

      {status === 'ready' && analysis && (
        <div className="space-y-7">
          {/* Summary */}
          {analysis.summary && (
            <Section title={he ? 'תקציר' : 'Summary'}>
              <p className="text-[15px] leading-relaxed text-stone-700 dark:text-zinc-300">{analysis.summary}</p>
            </Section>
          )}

          {/* Insights */}
          {analysis.insights && analysis.insights.length > 0 && (
            <Section title={he ? 'תובנות' : 'Insights'}>
              <div className="space-y-2.5">
                {analysis.insights.map((ins, i) => (
                  <div key={i} className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
                    {ins.title && <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-zinc-500 mb-1">{ins.title}</h3>}
                    <p className="text-[15px] leading-relaxed text-stone-800 dark:text-zinc-200">{ins.content}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Key moments */}
          {analysis.key_moments && analysis.key_moments.length > 0 && (
            <Section title={he ? 'רגעי מפתח' : 'Key moments'}>
              <div className="space-y-3">
                {analysis.key_moments.map((km, i) => (
                  <div key={i} className="border-s-2 border-clay/50 ps-3.5">
                    <p className="text-[15px] leading-relaxed text-stone-800 dark:text-zinc-200">{km.moment}</p>
                    {km.why && <p className="text-sm text-stone-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{km.why}</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Reflective questions */}
          {analysis.questions && analysis.questions.length > 0 && (
            <Section title={he ? 'שאלות לרפלקציה' : 'Questions to sit with'}>
              <ul className="space-y-2">
                {analysis.questions.map((q, i) => (
                  <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-stone-700 dark:text-zinc-300">
                    <span className="text-clay shrink-0">—</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* References */}
          {analysis.references && analysis.references.length > 0 && (
            <Section title={he ? 'להרחבה' : 'Further reading'}>
              <div className="space-y-2.5">
                {analysis.references.map((r, i) => (
                  <div key={i} className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="px-2 py-0.5 rounded-full bg-stone-100 dark:bg-zinc-800 text-[11px] font-medium text-stone-500 dark:text-zinc-400">{refKindLabel(r.kind)}</span>
                      <span className="text-[15px] font-medium text-stone-900 dark:text-zinc-100">{r.title}</span>
                    </div>
                    {r.note && <p className="text-sm text-stone-500 dark:text-zinc-400 leading-relaxed">{r.note}</p>}
                    {r.url && (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-block mt-1 text-sm text-clay hover:underline">
                        {he ? 'לצפייה בהרצאות ↗' : 'View lectures ↗'}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Nothing to show (very short conversation) */}
          {!analysis.summary && !(analysis.insights?.length) && !(analysis.questions?.length) && !(analysis.key_moments?.length) && (
            <p className="text-sm text-stone-400 dark:text-zinc-600 text-center py-8">
              {he ? 'השיחה קצרה מכדי להפיק ממנה ניתוח.' : 'This conversation was too short to analyze.'}
            </p>
          )}
        </div>
      )}

      <div className="h-12" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-stone-700 dark:text-zinc-300 mb-2.5">{title}</h2>
      {children}
    </section>
  );
}
