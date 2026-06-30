'use client';

import { useEffect, useState } from 'react';
import { useLang } from '@/lib/i18n';
import { getTelegramStatus, getTelegramLinkCode, type TelegramStatus } from '@/lib/api';

// Lets a logged-in user link their Telegram to their account. Renders nothing
// until the Telegram feature is configured + live on the backend (env vars set).
export default function ConnectTelegram() {
  const { language } = useLang();
  const he = language === 'he';

  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [tgLink, setTgLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    getTelegramStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  // Hidden entirely until the Telegram bot is live.
  if (!status || !status.configured) return null;

  async function connect() {
    setBusy(true); setErr('');
    try {
      const r = await getTelegramLinkCode();
      setCode(r.code); setTgLink(r.tgLink);
    } catch (e) {
      setErr(e instanceof Error ? e.message : (he ? 'משהו השתבש' : 'Something went wrong'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-sky-200 dark:border-sky-900 bg-sky-50/60 dark:bg-sky-950/20 p-5">
      <div className="flex items-center gap-2 mb-1.5">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-sky-500 dark:text-sky-400">
          <path d="M21.94 4.6 18.6 20.3c-.25 1.1-.92 1.37-1.86.85l-5.14-3.79-2.48 2.39c-.27.27-.5.5-1.03.5l.37-5.22 9.5-8.58c.41-.37-.09-.57-.64-.2L5.96 13.1l-5.06-1.58c-1.1-.34-1.12-1.1.23-1.63L20.5 3.04c.92-.34 1.72.2 1.44 1.56z" />
        </svg>
        <div className="font-semibold text-stone-900 dark:text-zinc-100">{he ? 'קופלAI בטלגרם' : 'KopelAi on Telegram'}</div>
      </div>

      {status.linked ? (
        <p className="text-sm text-stone-600 dark:text-zinc-300">
          {he
            ? 'הטלגרם שלך מחובר. אפשר לכתוב לקופלAI בטלגרם בכל עת - אותו זיכרון, אותו מנוי.'
            : 'Your Telegram is connected. Message KopelAi on Telegram anytime — same memory, same plan.'}
        </p>
      ) : code ? (
        <div className="space-y-2.5">
          <p className="text-sm text-stone-600 dark:text-zinc-300">
            {he ? 'פתחו את הבוט ושלחו לו את הקוד הזה כדי להתחבר:' : 'Open the bot and send it this code to connect:'}
          </p>
          <div className="inline-block font-mono text-lg font-bold tracking-wider px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-sky-300 dark:border-sky-800 text-stone-900 dark:text-zinc-100">
            {code}
          </div>
          {tgLink && (
            <div>
              <a
                href={tgLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium transition-colors"
              >
                {he ? 'פתיחת טלגרם עם הקוד' : 'Open Telegram with the code'}
              </a>
            </div>
          )}
          <p className="text-xs text-stone-400 dark:text-zinc-600">{he ? 'הקוד תקף ל-30 דקות.' : 'Code valid for 30 minutes.'}</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-stone-600 dark:text-zinc-300 mb-3">
            {he ? 'דברו עם קופלAI גם בטלגרם - אותו זיכרון, אותו מנוי, אותה שיחה.' : 'Talk to KopelAi on Telegram too — same memory, same plan, one relationship.'}
          </p>
          <button
            onClick={connect}
            disabled={busy}
            className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {busy ? (he ? 'רגע…' : 'One sec…') : (he ? 'חיבור טלגרם' : 'Connect Telegram')}
          </button>
        </>
      )}

      {err && <p className="text-xs text-rose-600 dark:text-rose-400 mt-2">{err}</p>}
    </div>
  );
}
