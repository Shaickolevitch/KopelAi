'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLang } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';
import { getSubscriptionTier } from '@/lib/subscription';
import { deleteHistory, deleteConversation } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import ChatTabs from '../ChatTabs';

type Convo = { id: string; started_at: string; ended_at: string | null; channel: string | null; summary: string | null; message_count: number | null };
type Msg = { id: string; conversation_id: string; role: string; content: string; created_at: string };

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

export default function HistoryPage() {
  const { language } = useLang();
  const he = language === 'he';

  const [tier, setTier] = useState<'free' | 'pro' | null>(null);
  const [convos, setConvos] = useState<Convo[]>([]);
  const [msgsByConvo, setMsgsByConvo] = useState<Record<string, Msg[]>>({});
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function deleteOne(id: string) {
    const msg = he
      ? 'למחוק לצמיתות את השיחה הזו? אי אפשר לבטל פעולה זו.'
      : 'Permanently delete this conversation? This cannot be undone.';
    if (!window.confirm(msg)) return;
    setDeletingId(id);
    try {
      await deleteConversation(id);
      setConvos((prev) => prev.filter((c) => c.id !== id));
      setMsgsByConvo((prev) => { const n = { ...prev }; delete n[id]; return n; });
    } catch {
      alert(he ? 'מחיקה נכשלה. נסה שוב.' : 'Delete failed. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  async function deleteAllHistory() {
    const msg = he
      ? 'למחוק לצמיתות את כל היסטוריית השיחות? קופל גם ישכח את כל מה שלמד עליך. אי אפשר לבטל פעולה זו.'
      : 'Permanently delete your entire chat history? Kopel will also forget everything it learned about you. This cannot be undone.';
    if (!window.confirm(msg)) return;
    setDeleting(true);
    try {
      await deleteHistory();
      setConvos([]);
      setMsgsByConvo({});
      setExpanded({});
    } catch {
      alert(he ? 'מחיקה נכשלה. נסה שוב.' : 'Delete failed. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { setLoading(false); return; }
      const t = await getSubscriptionTier(u.id);
      setTier(t);
      if (t === 'free') { setLoading(false); return; }

      const sb = supabase();
      const [{ data: cs }, { data: ms }] = await Promise.all([
        sb.from('conversations').select('id, started_at, ended_at, channel, summary, message_count')
          .eq('user_id', u.id).is('deleted_at', null).order('started_at', { ascending: false }).limit(300),
        sb.from('messages').select('id, conversation_id, role, content, created_at')
          .eq('user_id', u.id).is('deleted_at', null).order('created_at', { ascending: true }).limit(4000),
      ]);
      const grouped: Record<string, Msg[]> = {};
      (ms ?? []).forEach((m: Msg) => { (grouped[m.conversation_id] ||= []).push(m); });
      setConvos(cs ?? []);
      setMsgsByConvo(grouped);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const fromT = from ? new Date(from + 'T00:00:00').getTime() : -Infinity;
    const toT = to ? new Date(to + 'T23:59:59').getTime() : Infinity;
    return convos.filter((c) => {
      const t = new Date(c.started_at).getTime();
      if (t < fromT || t > toT) return false;
      if (!ql) return true;
      const inSummary = (c.summary || '').toLowerCase().includes(ql);
      const inMsgs = (msgsByConvo[c.id] || []).some((m) => m.content.toLowerCase().includes(ql));
      return inSummary || inMsgs;
    });
  }, [convos, msgsByConvo, q, from, to]);

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString(he ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function snippet(c: Convo) {
    if (c.summary) return c.summary;
    const first = (msgsByConvo[c.id] || []).find((m) => m.role === 'user');
    return first ? first.content : (he ? '(שיחה ריקה)' : '(empty)');
  }
  function channelLabel(ch: string | null) {
    if (ch === 'whatsapp') return he ? 'וואטסאפ' : 'WhatsApp';
    if (ch === 'telegram') return he ? 'טלגרם' : 'Telegram';
    return he ? 'אתר' : 'Web';
  }

  return (
    <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-4 sm:px-6 py-4">
      <ChatTabs active="history" />

      {loading ? (
        <div className="py-16 text-center text-stone-400 dark:text-zinc-600">…</div>
      ) : tier === 'free' ? (
        <div className="mt-6 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-zinc-100 mb-1">{he ? 'היסטוריה זמינה בפרו' : 'History is a Pro feature'}</h2>
          <p className="text-sm text-stone-500 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
            {he
              ? 'בגרסה החינמית כל שיחה עומדת בפני עצמה ולא נשמרת. בפרו קופלAI זוכר את כל השיחות - ותוכל/י לחפש ולעיין בהן כאן.'
              : 'On the free plan each conversation stands alone and isn’t saved. With Pro, KopelAi keeps every conversation — and you can search and revisit them here.'}
          </p>
        </div>
      ) : (
        <>
          {/* Search controls */}
          <div className="flex flex-wrap gap-2 mb-4">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={he ? 'חיפוש במילים…' : 'Search words…'}
              className="flex-1 min-w-[160px] px-3 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-stone-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-900/20 dark:focus:ring-indigo-500/30"
            />
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} title={he ? 'מתאריך' : 'From'}
              className="px-3 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-stone-700 dark:text-zinc-300 outline-none" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} title={he ? 'עד תאריך' : 'To'}
              className="px-3 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-stone-700 dark:text-zinc-300 outline-none" />
            {(q || from || to) && (
              <button onClick={() => { setQ(''); setFrom(''); setTo(''); }}
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 text-sm text-stone-500 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800">
                {he ? 'ניקוי' : 'Clear'}
              </button>
            )}
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-stone-400 dark:text-zinc-600">
              {he ? `${filtered.length} שיחות` : `${filtered.length} conversations`}
            </div>
            {convos.length > 0 && (
              <button
                onClick={deleteAllHistory}
                disabled={deleting}
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline disabled:opacity-50"
              >
                {deleting ? (he ? 'מוחק…' : 'Deleting…') : (he ? 'מחק את כל ההיסטוריה' : 'Delete all history')}
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-stone-400 dark:text-zinc-600">
              {convos.length === 0 ? (he ? 'אין עדיין היסטוריה.' : 'No history yet.') : (he ? 'לא נמצאו תוצאות.' : 'No matches.')}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((c) => {
                const isOpen = expanded[c.id];
                const msgs = msgsByConvo[c.id] || [];
                return (
                  <div key={c.id} className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                    <button
                      onClick={() => setExpanded((p) => ({ ...p, [c.id]: !p[c.id] }))}
                      className="w-full text-start px-4 py-3 hover:bg-stone-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-stone-900 dark:text-zinc-100">{fmtDate(c.started_at)}</span>
                        <span className="flex items-center gap-2 text-xs text-stone-400 dark:text-zinc-600">
                          <span className="px-2 py-0.5 rounded-full bg-stone-100 dark:bg-zinc-800">{channelLabel(c.channel)}</span>
                          <span>{msgs.length || c.message_count || 0} {he ? 'הודעות' : 'msgs'}</span>
                          <span>{isOpen ? '▾' : '▸'}</span>
                        </span>
                      </div>
                      <p className="text-sm text-stone-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {highlight(snippet(c).slice(0, 180), q.trim())}
                      </p>
                    </button>

                    {isOpen && (
                      <div className="border-t border-stone-100 dark:border-zinc-800 p-4 space-y-2.5 bg-stone-50/40 dark:bg-zinc-950/30">
                        {msgs.length === 0 ? (
                          <p className="text-sm text-stone-400 dark:text-zinc-600">{he ? '(אין הודעות שמורות)' : '(no saved messages)'}</p>
                        ) : msgs.map((m) => (
                          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[82%] px-3.5 py-2 text-sm leading-relaxed rounded-2xl ${
                              m.role === 'user'
                                ? 'bg-indigo-950 dark:bg-indigo-600 text-white rounded-br-sm'
                                : 'bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 text-stone-900 dark:text-zinc-100 rounded-bl-sm'
                            }`}>
                              <p className="whitespace-pre-wrap">{highlight(m.content, q.trim())}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-end px-4 py-2 border-t border-stone-100 dark:border-zinc-800">
                      <button
                        onClick={() => deleteOne(c.id)}
                        disabled={deletingId === c.id}
                        className="text-xs text-rose-600 dark:text-rose-400 hover:underline disabled:opacity-50"
                      >
                        {deletingId === c.id ? (he ? 'מוחק…' : 'Deleting…') : (he ? 'מחק שיחה' : 'Delete conversation')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
