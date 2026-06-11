'use client';

import { useEffect, useState } from 'react';
import { useLang } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';
import {
  getSubscriptionTier,
  startCheckout,
  cancelSubscription,
  invalidateSubscriptionCache,
  type SubscriptionTier,
} from '@/lib/subscription';
import { getUsage, startTrial } from '@/lib/api';
import ConnectWhatsApp from './ConnectWhatsApp';

export default function PlanPage() {
  const { language } = useLang();
  const isHebrew = language === 'he';

  const [tier, setTier] = useState<SubscriptionTier | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showStudent, setShowStudent] = useState(false);
  const [studentCode, setStudentCode] = useState('');
  // Trial status: 'available' (can start), 'active' (running), 'used' (over), or null while loading.
  const [trialStatus, setTrialStatus] = useState<'available' | 'active' | 'used' | 'paid' | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [startingTrial, setStartingTrial] = useState(false);

  async function loadTrial() {
    try {
      const usage = await getUsage();
      if (usage.trial) { setTrialStatus('active'); setTrialDaysLeft(usage.trialDaysLeft ?? 0); }
      else if (usage.trialAvailable) setTrialStatus('available');
      else if (usage.tier === 'pro') setTrialStatus('paid'); // real paid subscriber
      else setTrialStatus('used');
    } catch { setTrialStatus(null); }
  }

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (u) getSubscriptionTier(u.id).then(setTier).catch(() => setTier('free'));
      else setTier('free');
    });
    loadTrial();
  }, []);

  async function handleStartTrial() {
    if (startingTrial) return;
    setStartingTrial(true);
    setError('');
    setNotice('');
    try {
      const { trialDaysLeft: days } = await startTrial();
      invalidateSubscriptionCache();
      setTier('pro');
      setTrialStatus('active');
      setTrialDaysLeft(days);
      setNotice(isHebrew ? 'תקופת הניסיון הופעלה. נהנים מכל יכולות פרו!' : 'Your trial is on. Enjoy all of Pro!');
    } catch (e) {
      setError(e instanceof Error ? e.message : (isHebrew ? 'לא הצלחנו להתחיל את הניסיון.' : 'Could not start the trial.'));
    } finally {
      setStartingTrial(false);
    }
  }

  async function go(action: () => Promise<void>, key: string) {
    setBusy(key);
    setError('');
    try {
      await action();
    } catch (e) {
      let msg = e instanceof Error ? e.message : 'Something went wrong';
      if (msg.includes('No billing account')) {
        msg = isHebrew
          ? 'אין חשבון חיוב - גישת הפרו הוענקה ידנית, לא דרך תשלום. למנויים אמיתיים הכפתור יפתח את ניהול החיוב.'
          : 'No billing account - your Pro access was granted manually, not via payment. For real subscribers this opens the billing portal.';
      } else if (msg.includes('CHING_SECRET_KEY') || msg.includes('not configured')) {
        msg = isHebrew
          ? 'התשלומים עדיין לא פעילים - נפעיל אותם בקרוב. תודה על הסבלנות.'
          : "Payments aren't live yet - we're turning them on soon. Thanks for your patience.";
      } else if (/coupon|discount|not_found|invalid/i.test(msg)) {
        msg = isHebrew
          ? 'הקוד אינו תקין או שפג תוקפו. כדי לקבל קוד הטבה, פנו אלינו דרך עמוד יצירת הקשר.'
          : "That code isn't valid or has expired. To get a discount code, reach out via our contact page.";
      }
      setError(msg);
      setBusy(null);
    }
  }

  async function handleCancel() {
    const confirmMsg = isHebrew
      ? 'לבטל את המנוי? המנוי לא יתחדש בסוף התקופה.'
      : 'Cancel your subscription? It will not renew at the end of the period.';
    if (!window.confirm(confirmMsg)) return;
    setBusy('cancel');
    setError('');
    setNotice('');
    try {
      const { status } = await cancelSubscription();
      if (status === 'downgraded') {
        setTier('free');
        setNotice(isHebrew ? 'המנוי בוטל.' : 'Your subscription was cancelled.');
      } else {
        setNotice(
          isHebrew
            ? 'המנוי בוטל - תישאר פרו עד סוף התקופה הנוכחית, ולא יתבצע חיוב נוסף.'
            : "Cancelled - you'll stay Pro until the end of the current period, with no further charge."
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cancel failed');
    } finally {
      setBusy(null);
    }
  }

  const loading = tier === null;
  const isPro = tier === 'pro';

  return (
    <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-zinc-100 mb-1">
        {isHebrew ? 'המנוי שלי' : 'My plan'}
      </h1>
      <p className="text-stone-500 dark:text-zinc-400 mb-8">
        {isHebrew
          ? 'ניהול המנוי, התשלומים והחשבון שלך.'
          : 'Manage your subscription, billing, and account.'}
      </p>

      {/* Current plan */}
      <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm mb-4">
        <div className="text-sm text-stone-500 dark:text-zinc-500 mb-1">
          {isHebrew ? 'התוכנית הנוכחית' : 'Current plan'}
        </div>
        <div className="text-lg font-semibold text-stone-900 dark:text-zinc-100">
          {loading ? '…' : isPro ? (isHebrew ? 'קופלAI פרו' : 'KopelAi Pro') : isHebrew ? 'חינמית' : 'Free'}
        </div>
        <p className="text-sm text-stone-500 dark:text-zinc-500 mt-1">
          {isPro
            ? isHebrew
              ? 'זיכרון לאורך זמן וניתוח מצטבר פעילים.'
              : 'Long-term memory and cumulative analysis are active.'
            : isHebrew
            ? 'שיחות בודדות, ללא זיכרון לאורך זמן.'
            : 'Single conversations, without memory over time.'}
        </p>
      </div>

      {/* Pro trial status + manual start (hidden for paid subscribers) */}
      {trialStatus && trialStatus !== 'paid' && (
        <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
                {isHebrew ? 'תקופת ניסיון פרו · 14 ימים' : 'Pro trial · 14 days'}
              </div>
              <div className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5 leading-snug">
                {trialStatus === 'active'
                  ? (isHebrew ? `נותרו ${trialDaysLeft} ימים · בסיום חוזרים לחינמית` : `${trialDaysLeft} days left · reverts to Free after`)
                  : trialStatus === 'available'
                  ? (isHebrew ? 'זיכרון, תובנות ועד 50 הודעות ביום - חינם, ללא כרטיס אשראי' : 'Memory, insights, up to 50 messages/day - free, no card')
                  : (isHebrew ? 'תקופת הניסיון כבר נוצלה' : 'Your trial has already been used')}
              </div>
            </div>
            <span
              className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
                trialStatus === 'active'
                  ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                  : trialStatus === 'available'
                  ? 'bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400'
                  : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
              }`}
            >
              {trialStatus === 'active'
                ? (isHebrew ? 'פעיל' : 'On')
                : trialStatus === 'available'
                ? (isHebrew ? 'כבוי' : 'Off')
                : (isHebrew ? 'נוצל' : 'Used')}
            </span>
          </div>
          {trialStatus === 'available' && (
            <button
              onClick={handleStartTrial}
              disabled={startingTrial}
              className="mt-4 w-full px-5 py-2.5 rounded-xl bg-indigo-950 dark:bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors disabled:opacity-60"
            >
              {startingTrial
                ? (isHebrew ? 'מפעילים…' : 'Starting…')
                : (isHebrew ? 'הפעילו 14 ימי ניסיון חינם' : 'Start 14-day free trial')}
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-sm p-3 mb-4">
          {error}
        </div>
      )}

      {/* Plans - switch directly here */}
      <div className="font-semibold text-stone-900 dark:text-zinc-100 mb-1">
        {isPro ? (isHebrew ? 'החלפת תוכנית' : 'Switch plan') : isHebrew ? 'בחירת תוכנית' : 'Choose a plan'}
      </div>
      <p className="text-sm text-stone-500 dark:text-zinc-400 mb-2">
        {isHebrew
          ? 'ההבדל בין חינם לפרו: בחינם כל שיחה עומדת בפני עצמה. בפרו קופלAI זוכר אותך לאורך זמן ובונה ניתוח מצטבר.'
          : 'Free vs Pro: on Free each conversation stands alone. On Pro, KopelAi remembers you over time and builds cumulative analysis.'}
      </p>
      <p className="text-sm text-stone-600 dark:text-zinc-300 mb-4">
        {isHebrew
          ? 'כאילו שילמת על מפגש אחד בחודש - ומקבלים את קופלAI תמיד.'
          : 'About the price of one therapy hour a month - and you get KopelAi always.'}
      </p>
      <div className="grid sm:grid-cols-3 gap-4">
        {/* Free */}
        <div
          className={`rounded-xl border p-5 shadow-sm flex flex-col ${
            tier === 'free'
              ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20'
              : 'border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
          }`}
        >
          <div className="font-semibold text-stone-900 dark:text-zinc-100">
            {isHebrew ? 'חינם' : 'Free'}
          </div>
          <div className="text-2xl font-bold text-stone-900 dark:text-zinc-100 mt-1">₪0</div>
          <ul className="mt-3 space-y-1.5 text-sm text-stone-600 dark:text-zinc-400 flex-1">
            <li>✓ {isHebrew ? 'שיחות ללא הגבלה' : 'Unlimited conversations'}</li>
            <li className="text-stone-400 dark:text-zinc-600">- {isHebrew ? 'כל שיחה עומדת בפני עצמה' : 'Each conversation stands alone'}</li>
            <li className="text-stone-400 dark:text-zinc-600">- {isHebrew ? 'ללא זיכרון לאורך זמן' : 'No long-term memory'}</li>
            <li className="text-stone-400 dark:text-zinc-600">- {isHebrew ? 'ללא ניתוח מצטבר' : 'No cumulative analysis'}</li>
          </ul>
          {tier === 'free' ? (
            <div className="mt-4 px-5 py-2.5 rounded-xl border border-indigo-300 dark:border-indigo-800 text-center text-sm font-medium text-indigo-800 dark:text-indigo-300">
              ✓ {isHebrew ? 'התוכנית הנוכחית' : 'Current plan'}
            </div>
          ) : (
            <div className="mt-4 text-xs text-stone-400 dark:text-zinc-600 text-center">
              {isHebrew ? 'למעבר לחינם יש לבטל את המנוי' : 'To switch to Free, cancel your subscription'}
            </div>
          )}
        </div>

        {/* Monthly */}
        <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm flex flex-col">
          <div className="font-semibold text-stone-900 dark:text-zinc-100">
            {isHebrew ? 'חודשי' : 'Monthly'} · {isHebrew ? 'פרו' : 'Pro'}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-stone-900 dark:text-zinc-100">₪99</span>
            <span className="text-sm font-normal text-stone-500"> / {isHebrew ? 'חודש' : 'mo'}</span>
          </div>
          <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">
            {isHebrew ? 'פחות משליש ממחיר מפגש אחד · מחיר השקה' : 'Less than a third of one session · launch price'}
          </div>
          <ul className="mt-3 space-y-1.5 text-sm text-stone-600 dark:text-zinc-400 flex-1">
            <li>✓ {isHebrew ? 'זיכרון לאורך זמן - קופלAI זוכר אותך בין שיחות' : 'Long-term memory - KopelAi remembers you between sessions'}</li>
            <li>✓ {isHebrew ? 'ניתוח מצטבר בעמוד הניתוח' : 'Cumulative analysis on the Analysis page'}</li>
            <li>✓ {isHebrew ? 'שיחות ללא הגבלה' : 'Unlimited conversations'}</li>
          </ul>
          <button
            onClick={() => go(() => startCheckout('monthly'), 'monthly')}
            disabled={busy !== null || loading}
            className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-950 dark:bg-indigo-600 text-white font-medium hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors disabled:opacity-60"
          >
            {busy === 'monthly'
              ? (isHebrew ? 'מעביר לתשלום…' : 'Redirecting…')
              : isPro
              ? (isHebrew ? 'מעבר לחודשי' : 'Switch to monthly')
              : (isHebrew ? 'שדרג' : 'Upgrade')}
          </button>
        </div>

        {/* Annual */}
        <div className="rounded-xl border-2 border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 p-5 shadow-sm flex flex-col relative">
          <span className="absolute -top-2.5 right-4 text-xs bg-indigo-950 dark:bg-indigo-600 text-white px-2 py-0.5 rounded-full">
            {isHebrew ? 'הכי משתלם' : 'Best value'}
          </span>
          <div className="font-semibold text-stone-900 dark:text-zinc-100">
            {isHebrew ? 'שנתי' : 'Annual'} · {isHebrew ? 'פרו' : 'Pro'}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-stone-900 dark:text-zinc-100">₪990</span>
            <span className="text-base text-stone-400 dark:text-zinc-600 line-through">₪1,188</span>
            <span className="text-sm font-normal text-stone-500"> / {isHebrew ? 'שנה' : 'yr'}</span>
          </div>
          <div className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">
            {isHebrew ? 'כ-₪82 לחודש · כחודשיים מתנה' : '~₪82/mo · about two months free'}
          </div>
          <ul className="mt-3 space-y-1.5 text-sm text-stone-600 dark:text-zinc-400 flex-1">
            <li>✓ {isHebrew ? 'זיכרון לאורך זמן - קופלAI זוכר אותך בין שיחות' : 'Long-term memory - KopelAi remembers you between sessions'}</li>
            <li>✓ {isHebrew ? 'ניתוח מצטבר בעמוד הניתוח' : 'Cumulative analysis on the Analysis page'}</li>
            <li>✓ {isHebrew ? 'שיחות ללא הגבלה' : 'Unlimited conversations'}</li>
            <li>✓ {isHebrew ? 'חיסכון של חודשיים בשנה' : 'Two months free vs monthly'}</li>
          </ul>
          <button
            onClick={() => go(() => startCheckout('annual'), 'annual')}
            disabled={busy !== null || loading}
            className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-950 dark:bg-indigo-600 text-white font-medium hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors disabled:opacity-60"
          >
            {busy === 'annual'
              ? (isHebrew ? 'מעביר לתשלום…' : 'Redirecting…')
              : isPro
              ? (isHebrew ? 'מעבר לשנתי' : 'Switch to annual')
              : (isHebrew ? 'שדרג' : 'Upgrade')}
          </button>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-amber-700 dark:text-amber-400">
        {isHebrew
          ? 'מחיר השקה ראשוני וזמני - עשוי להתעדכן בהמשך. המצטרפים עכשיו נשארים במחיר הזה.'
          : 'Introductory launch price - may change later. Join now and keep this price.'}
      </p>
      <p className="mt-2 text-center text-xs text-stone-400 dark:text-zinc-600">
        {isHebrew
          ? 'תשלום מאובטח דרך Ching · חשבונית מס · ניתן לבטל בכל עת'
          : 'Secure payment via Ching · Tax invoice · Cancel anytime'}
      </p>

      <ConnectWhatsApp />

      {/* Student / trainee rate - unlocked with a code requested from us directly */}
      {!isPro && (
        <div className="mt-5 text-center">
          {!showStudent ? (
            <button
              onClick={() => setShowStudent(true)}
              className="text-xs text-stone-400 dark:text-zinc-500 hover:underline"
            >
              {isHebrew ? 'סטודנט/ית או מתמחה? יש קוד הטבה - לחצו לפרטים' : 'Student or trainee? A discount code is available - tap for details'}
            </button>
          ) : (
            <div className="inline-flex flex-col items-center gap-2">
              <p className="text-xs text-stone-500 dark:text-zinc-400 max-w-xs leading-snug">
                {isHebrew
                  ? 'יש לכם קוד הטבה לסטודנטים/מתמחים? הזינו אותו וההנחה תחול על המנוי. לקבלת קוד, פנו אלינו דרך עמוד יצירת הקשר.'
                  : 'Have a student/trainee discount code? Enter it and the discount applies to your subscription. To get a code, reach out via our contact page.'}
              </p>
              <div className="flex gap-2">
                <input
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  placeholder={isHebrew ? 'קוד הטבה' : 'Discount code'}
                  className="px-3 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-stone-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-900/20 dark:focus:ring-indigo-500/30"
                />
                <button
                  onClick={() => go(() => startCheckout('monthly', studentCode), 'student')}
                  disabled={busy !== null || loading || !studentCode.trim()}
                  className="px-4 py-2 rounded-lg bg-indigo-950 dark:bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors disabled:opacity-50"
                >
                  {busy === 'student' ? (isHebrew ? 'מעביר…' : '…') : (isHebrew ? 'הפעלת קוד' : 'Apply')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cancel subscription (Pro only) - one click */}
      {isPro && (
        <div className="mt-6 text-center">
          <button
            onClick={handleCancel}
            disabled={busy !== null}
            className="text-sm text-rose-600 dark:text-rose-400 hover:underline disabled:opacity-60"
          >
            {busy === 'cancel'
              ? (isHebrew ? 'מבטל…' : 'Cancelling…')
              : (isHebrew ? 'ביטול מנוי' : 'Cancel subscription')}
          </button>
        </div>
      )}

      {notice && (
        <div className="mt-4 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-sm p-3 text-center">
          {notice}
        </div>
      )}
    </div>
  );
}
