'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useT, useLang } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { INSIGHT_CATEGORIES, getCategoryLabel } from '@kopelai/shared';
import { getSubscriptionTier } from '@/lib/subscription';

type Insight = {
  id: string;
  category: string;
  content: string;
  confidence: number;
  source_message_ids: string[];
  created_at: string;
};

type Stats = {
  conversation_count: number;
  message_count: number;
  last_activity_at: string | null;
};

const CATEGORY_COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-sky-500', 'bg-teal-500',
  'bg-emerald-500', 'bg-amber-500', 'bg-orange-500', 'bg-rose-500',
  'bg-pink-500', 'bg-fuchsia-500', 'bg-cyan-500', 'bg-lime-500',
  'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500', 'bg-slate-500',
];

export default function InsightsPage() {
  const t = useT();
  const { language } = useLang();

  const [userId, setUserId] = useState<string | null>(null);
  const [opener, setOpener] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(true);

  // Declare loadAll/init with useCallback before the useEffects that reference them
  const loadAll = useCallback(async (uid: string) => {
    const sb = supabase();

    const { data: profileRow } = await sb
      .from('user_profile').select('display_opener').eq('user_id', uid).maybeSingle();
    setOpener(profileRow?.display_opener ?? null);

    const [convoRes, msgRes, lastMsgRes] = await Promise.all([
      sb.from('conversations').select('*', { count: 'exact', head: true }).eq('user_id', uid).not('ended_at', 'is', null),
      sb.from('messages').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      sb.from('messages').select('created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    setStats({
      conversation_count: convoRes.count ?? 0,
      message_count: msgRes.count ?? 0,
      last_activity_at: lastMsgRes.data?.created_at ?? null,
    });

    const { data: insightRows } = await sb
      .from('insights').select('*').eq('user_id', uid).order('confidence', { ascending: false });
    setInsights(insightRows ?? []);
  }, []);

  const init = useCallback(async () => {
    const user = await getCurrentUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);
    const [tier] = await Promise.all([
      getSubscriptionTier(user.id),
      loadAll(user.id),
    ]);
    setIsPro(tier === 'pro');
    setLoading(false);
  }, [loadAll]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    init();
  }, [init]);

  // Refetch when the tab becomes visible (e.g. after ending a session)
  useEffect(() => {
    function handleVisibilityChange() {
      if (!document.hidden && userId) loadAll(userId);
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userId, loadAll]);

  const insightByCategory = new Map<string, Insight>();
  insights.forEach((ins) => insightByCategory.set(ins.category, ins));
  // Only show insights once there's real activity — avoids stale text at 0 sessions.
  const hasActivity = !!stats && (stats.conversation_count > 0 || stats.message_count > 0);
  const hasAnyInsights = hasActivity && (insights.length > 0 || (opener && opener.trim().length > 0));

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 150, 300].map((d) => (
            <span key={d} className="w-2 h-2 rounded-full bg-stone-400 dark:bg-zinc-600 animate-bounce"
              style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  // Analysis is a Pro feature — free users see a locked, greyed-out state.
  if (!isPro) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md text-center opacity-90">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400 dark:text-zinc-500">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-stone-700 dark:text-zinc-300 mb-3">
            {language === 'he' ? 'אפשרות זו פתוחה למשתמשי פרו' : 'This is open to Pro members'}
          </h2>
          <p className="text-stone-500 dark:text-zinc-500 leading-relaxed mb-6 text-sm">
            {language === 'he'
              ? 'בתוכנית פרו, קופלAI זוכר אותך בין מפגשים ומפיק כאן תובנות אישיות — הדפוסים שלך, החוזקות, ונקודות העיוורון.'
              : 'With Pro, KopelAi remembers you between sessions and builds your personal insights here — your patterns, strengths, and blind spots.'}
          </p>
          <Link
            href="/app/plan"
            className="inline-block px-6 py-3 rounded-xl bg-indigo-950 dark:bg-indigo-600 text-white font-medium hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors"
          >
            {language === 'he' ? 'שדרג לפרו' : 'Upgrade to Pro'}
          </Link>
        </div>
      </div>
    );
  }

  if (!hasAnyInsights) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mx-auto mb-5">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400 dark:text-indigo-500">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="12" y2="17"/>
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-stone-900 dark:text-zinc-100 mb-3">{t.insights_empty_title}</h2>
          <p className="text-stone-500 dark:text-zinc-500 leading-relaxed mb-4 text-sm">{t.insights_empty_body}</p>
          <p className="text-sm text-stone-400 dark:text-zinc-600 italic mb-6">{t.insights_empty_footer}</p>
          <Link
            href="/app/conversation"
            className="inline-block px-6 py-3 rounded-xl bg-indigo-950 dark:bg-indigo-600 text-white font-medium hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors"
          >
            {language === 'he' ? 'התחל שיחה עם קופלAI ←' : 'Start a conversation →'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-3xl font-bold text-stone-900 dark:text-zinc-100 mb-6">{t.insights_title}</h1>

      {/* Stats strip */}
      {stats && (
        <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-2xl mb-6 shadow-sm overflow-hidden">
          <div className="flex divide-x divide-stone-100 dark:divide-zinc-800">
            <StatCell value={stats.conversation_count} label={t.insights_stat_conversations} />
            <StatCell value={stats.message_count} label={t.insights_stat_messages} />
            <StatCell value={formatRelativeTime(stats.last_activity_at, t)} label={t.insights_stat_last_activity} />
          </div>
        </div>
      )}

      {/* Opener paragraph */}
      {opener && opener.trim().length > 0 && (
        <p className="text-stone-700 dark:text-zinc-300 leading-relaxed mb-6 px-1 text-[15px]">{opener}</p>
      )}

      {/* Insight cards */}
      {/* Pro upgrade banner for free users */}
      {!isPro && (
        <div className="mb-6 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/30 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 mb-0.5">{t.insights_pro_banner_title}</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 leading-relaxed">{t.insights_pro_banner_body}</p>
          </div>
          <Link
            href="/app/plan"
            className="shrink-0 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white text-xs font-semibold transition-colors text-center"
          >
            {t.insights_pro_banner_cta}
          </Link>
        </div>
      )}

      <div className="space-y-2.5">
        {INSIGHT_CATEGORIES.map((cat, idx) => {
          const ins = insightByCategory.get(cat.key);
          const accentColor = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
          return (
            <div key={cat.key}
              className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm flex">
              <div className={`w-1 shrink-0 ${accentColor} opacity-60`} />
              <div className="px-4 py-4 flex-1 min-w-0">
                <h3 className="font-semibold text-stone-500 dark:text-zinc-500 mb-1.5 text-xs uppercase tracking-widest">
                  {getCategoryLabel(cat.key, language)}
                </h3>
                {ins ? (
                  <p className="text-stone-800 dark:text-zinc-200 leading-relaxed text-[15px]">{ins.content}</p>
                ) : (
                  <p className="text-sm text-stone-400 dark:text-zinc-600 italic">{t.insights_card_empty}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="h-12" />
    </div>
  );
}

function StatCell({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex-1 text-center py-4 px-2">
      <div className="text-xl font-bold text-stone-900 dark:text-zinc-100">{value}</div>
      <div className="text-xs text-stone-500 dark:text-zinc-500 mt-0.5">{label}</div>
    </div>
  );
}

function formatRelativeTime(iso: string | null, t: ReturnType<typeof useT>): string {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return t.time_now;
  if (diffMin < 60) return t.time_minutes(diffMin);
  if (diffHr < 24) return t.time_hours(diffHr);
  if (diffDay < 7) return t.time_days(diffDay);
  if (diffDay < 30) return t.time_weeks(Math.floor(diffDay / 7));
  return t.time_months(Math.floor(diffDay / 30));
}
