'use client';

import { useEffect, useState } from 'react';
import { useLang } from '@/lib/i18n';
import { getWhatsappStatus, getWhatsappLinkCode, type WhatsappStatus } from '@/lib/api';

// Lets a logged-in user link their WhatsApp to their account. Renders nothing
// until the WhatsApp feature is configured on the backend (env vars set).
export default function ConnectWhatsApp() {
  const { language } = useLang();
  const he = language === 'he';

  const [status, setStatus] = useState<WhatsappStatus | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [waLink, setWaLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    getWhatsappStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  // Hidden entirely until the WhatsApp number is live.
  if (!status || !status.configured) return null;

  async function connect() {
    setBusy(true); setErr('');
    try {
      const r = await getWhatsappLinkCode();
      setCode(r.code); setWaLink(r.waLink);
    } catch (e) {
      setErr(e instanceof Error ? e.message : (he ? 'משהו השתבש' : 'Something went wrong'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/20 p-5">
      <div className="flex items-center gap-2 mb-1.5">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 dark:text-emerald-400">
          <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 0 1-.9-3.8A8.38 8.38 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5z" />
        </svg>
        <div className="font-semibold text-stone-900 dark:text-zinc-100">{he ? 'קופלAI בוואטסאפ' : 'KopelAi on WhatsApp'}</div>
      </div>

      {status.linked ? (
        <p className="text-sm text-stone-600 dark:text-zinc-300">
          {he
            ? `מחובר למספר ${status.phone}. אפשר לכתוב לקופלAI בוואטסאפ בכל עת - אותו זיכרון, אותו מנוי.`
            : `Connected to ${status.phone}. Message KopelAi on WhatsApp anytime — same memory, same plan.`}
        </p>
      ) : code ? (
        <div className="space-y-2.5">
          <p className="text-sm text-stone-600 dark:text-zinc-300">
            {he ? 'שלחו לקופלAI את הקוד הזה בוואטסאפ כדי להתחבר:' : 'Send KopelAi this code on WhatsApp to connect:'}
          </p>
          <div className="inline-block font-mono text-lg font-bold tracking-wider px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-800 text-stone-900 dark:text-zinc-100">
            {code}
          </div>
          {waLink && (
            <div>
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
              >
                {he ? 'פתיחת וואטסאפ עם הקוד' : 'Open WhatsApp with the code'}
              </a>
            </div>
          )}
          <p className="text-xs text-stone-400 dark:text-zinc-600">{he ? 'הקוד תקף ל-30 דקות.' : 'Code valid for 30 minutes.'}</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-stone-600 dark:text-zinc-300 mb-3">
            {he ? 'דברו עם קופלAI גם בוואטסאפ - אותו זיכרון, אותו מנוי, אותה שיחה.' : 'Talk to KopelAi on WhatsApp too — same memory, same plan, one relationship.'}
          </p>
          <button
            onClick={connect}
            disabled={busy}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {busy ? (he ? 'רגע…' : 'One sec…') : (he ? 'חיבור וואטסאפ' : 'Connect WhatsApp')}
          </button>
        </>
      )}

      {err && <p className="text-xs text-rose-600 dark:text-rose-400 mt-2">{err}</p>}
    </div>
  );
}
