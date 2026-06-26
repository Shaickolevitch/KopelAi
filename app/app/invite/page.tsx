'use client';

import { useEffect, useState } from 'react';
import { useLang } from '@/lib/i18n';
import { getReferral, ReferralInfo } from '@/lib/api';
import { DropSpot } from '../rewards';

export default function InvitePage() {
  const { language } = useLang();
  const he = language === 'he';
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getReferral()
      .then(setInfo)
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, []);

  const url = info?.url ?? '';

  const shareText = he
    ? `הצטרפ/י אליי לקופלAI - מרחב שיחה רפלקטיבי למטפלים:`
    : `Join me on KopelAi - a reflective space for therapists:`;

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function share() {
    if (!url) return;
    const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string; url?: string }) => Promise<void> };
    if (nav.share) {
      try { await nav.share({ title: 'KopelAi', text: shareText, url }); return; } catch {}
    }
    copy();
  }

  const waHref = url
    ? `https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`
    : '#';

  const proUntilLabel = info?.proUntil
    ? new Date(info.proUntil).toLocaleDateString(he ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
      <DropSpot sources={['referral']} />
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-clay/10 text-clay mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 11h-6M19 8v6" /></svg>
        </div>
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-zinc-100 mb-2">
          {he ? 'מזמינים חבר, מרוויחים חודש' : 'Invite a friend, earn a month'}
        </h1>
        <p className="text-stone-500 dark:text-zinc-400 leading-relaxed">
          {he
            ? 'שתף את הקישור שלך. כשחבר שנרשם דרכו הופך למנוי פרו - אתה מקבל חודש פרו, חינם. חודשים מצטברים.'
            : 'Share your link. When a friend who signed up through it becomes a Pro subscriber, you get a free month of Pro. Months stack.'}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="flex gap-1.5">
            {[0, 150, 300].map((d) => (
              <span key={d} className="w-2 h-2 rounded-full bg-stone-300 dark:bg-zinc-700 animate-bounce" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        </div>
      ) : !url ? (
        <p className="text-center text-stone-500 dark:text-zinc-400">
          {he ? 'לא הצלחנו לטעון את קישור ההזמנה. נסה לרענן.' : 'Could not load your invite link. Try refreshing.'}
        </p>
      ) : (
        <>
          {/* Invite link */}
          <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-2xl p-5 mb-4">
            <label className="block text-xs font-medium text-stone-400 dark:text-zinc-500 mb-2 uppercase tracking-wide">
              {he ? 'הקישור שלך' : 'Your link'}
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-0 px-3 py-2.5 text-sm rounded-xl bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 text-stone-700 dark:text-zinc-300 ltr text-left"
                dir="ltr"
              />
              <button
                onClick={copy}
                className="shrink-0 px-4 py-2.5 text-sm font-medium rounded-xl bg-indigo-950 dark:bg-indigo-600 text-white hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors"
              >
                {copied ? (he ? 'הועתק ✓' : 'Copied ✓') : (he ? 'העתק' : 'Copy')}
              </button>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={share}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-clay text-white hover:opacity-90 transition-opacity"
              >
                {he ? 'שיתוף' : 'Share'}
              </button>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center px-4 py-2.5 text-sm font-medium rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
              >
                {he ? 'שליחה בוואטסאפ' : 'Send on WhatsApp'}
              </a>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-2xl p-4 text-center">
              <div className="text-3xl font-semibold text-stone-900 dark:text-zinc-100">{info?.joined ?? 0}</div>
              <div className="text-xs text-stone-500 dark:text-zinc-400 mt-1">{he ? 'הצטרפו דרכך' : 'Joined via you'}</div>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-2xl p-4 text-center">
              <div className="text-3xl font-semibold text-clay">{info?.rewarded ?? 0}</div>
              <div className="text-xs text-stone-500 dark:text-zinc-400 mt-1">{he ? 'חודשים שהרווחת' : 'Months earned'}</div>
            </div>
          </div>

          {info?.active && proUntilLabel && (
            <div className="bg-clay/10 border border-clay/20 rounded-2xl p-4 text-center text-sm text-stone-700 dark:text-zinc-300">
              {he
                ? <>פרו במתנה פעיל אצלך עד <span className="font-semibold">{proUntilLabel}</span> 🎁</>
                : <>Your comped Pro is active until <span className="font-semibold">{proUntilLabel}</span> 🎁</>}
            </div>
          )}

          {/* How it works */}
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-stone-700 dark:text-zinc-300 mb-3">{he ? 'איך זה עובד' : 'How it works'}</h2>
            <ol className="space-y-3">
              {(he
                ? [
                    'שתף את הקישור שלך עם חברים או קולגות.',
                    'הם נרשמים לקופלAI דרך הקישור.',
                    'כשהם הופכים למנויי פרו - אתה מקבל חודש פרו, חינם. חודשים מצטברים.',
                  ]
                : [
                    'Share your link with friends or colleagues.',
                    'They sign up for KopelAi through it.',
                    'When they become Pro subscribers, you get a free month of Pro. Months stack.',
                  ]
              ).map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-stone-600 dark:text-zinc-400">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300 flex items-center justify-center text-xs font-semibold">{i + 1}</span>
                  <span className="leading-relaxed pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}
    </div>
  );
}
