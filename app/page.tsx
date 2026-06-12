'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';

const PILLARS = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
    ),
    he: { title: 'שיחה', body: 'מדברים כמו עם עמית בכיר - לא טופס, לא מבחן.' },
    en: { title: 'Conversation', body: 'Talk like you would to a senior colleague - not a form, not a test.' },
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10" /><path d="M12 8v4l3 3" /></svg>
    ),
    he: { title: 'זיכרון', body: 'כל מפגש, קופלAI זוכר עוד עליך וממשיך מאיפה שהפסקתם.' },
    en: { title: 'Memory', body: 'Each session, KopelAi remembers more and picks up where you left off.' },
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4v16" /></svg>
    ),
    he: { title: 'תובנות', body: 'הדפוסים, החוזקות ונקודות העיוורון - מוצגים מולך.' },
    en: { title: 'Insights', body: 'Your patterns, strengths, and blind spots - made visible.' },
  },
];

const STEPS = [
  { he: { t: 'מדברים', b: 'משהו מהשבוע, מפגש קשה, מחשבה שחוזרת.' }, en: { t: 'Talk', b: 'Something from your week, a hard session, a recurring thought.' } },
  { he: { t: 'מסיימים שיחה', b: 'לחיצה אחת, וקופלAI מנתח את מה שעלה.' }, en: { t: 'End the session', b: 'One tap, and KopelAi analyzes what came up.' } },
  { he: { t: 'מקבלים ניתוח', b: 'דפוסים, חוזקות ונקודות עיוורון בעמוד הניתוח.' }, en: { t: 'Get analysis', b: 'Patterns, strengths, and blind spots on the Analysis page.' } },
  { he: { t: 'ממשיכים', b: 'בפעם הבאה קופלAI כבר מכיר אותך - והתמונה מתחדדת.' }, en: { t: 'Continue', b: 'Next time KopelAi already knows you - and the picture sharpens.' } },
];

const AUDIENCE = [
  { he: 'מטפל/ת שרוצה להיות מודע/ת יותר לעצמו/ה - לחוזקות, לנקודות העיוורון ולדפוסים שחוזרים.', en: 'A therapist who wants to be more self-aware - of their strengths, blind spots, and recurring patterns.' },
  { he: 'מי שמרגיש/ה שהעבודה הטיפולית נוגעת בו/ה, ורוצה מרחב פרטי לעבד את זה.', en: 'Someone who feels the work touches them, and wants a private space to process it.' },
  { he: 'מי שמחפש/ת צמיחה מקצועית מתמשכת - מרחב אישי, מעבר לכלים לניהול מטופלים.', en: 'Someone after ongoing professional growth - a personal space, beyond client-management tools.' },
];

const PEOPLE = [
  {
    key: 'kopel', photo: '/kopel.jpg',
    he: { name: 'קופל אליעזר', role: 'ההשראה', line: 'פסיכואנליטיקאי עצמאי, עובד בתל אביב. יוצר "פסיכואנליזה - בין שעה לשעה" - 77 הרצאות פסיכואנליטיות.' },
    en: { name: 'Kopel Eliezer', role: 'The inspiration', line: 'An independent psychoanalyst based in Tel Aviv. Creator of "Psychoanalysis - Hour by Hour" - 77 psychoanalytic lectures.' },
  },
  {
    key: 'shai', photo: '/shai.jpg',
    he: { name: 'שי חי גיאן', role: 'המייסד והמפתח', line: 'היזם והמפתח שמאחורי קופלAI.' },
    en: { name: 'Shai Hay Gian', role: 'Founder & developer', line: 'The founder and developer behind KopelAi.' },
  },
];

const FAQ = [
  { he: { q: 'זה טיפול?', a: 'לא. זה מרחב רפלקציה אישי למטפלים - לא תחליף לטיפול או להדרכה פורמלית.' }, en: { q: 'Is this therapy?', a: "No. It's a personal reflective space for therapists - not a substitute for therapy or formal supervision." } },
  { he: { q: 'השיחות שלי פרטיות?', a: 'כן. השיחות מוצפנות ופרטיות, ומומלץ לשמור על אנונימיות של מטופלים.' }, en: { q: 'Are my conversations private?', a: 'Yes. Conversations are encrypted and private; we recommend keeping clients anonymous.' } },
  { he: { q: 'מה ההבדל בין חינם לפרו?', a: 'בחינם אפשר לשוחח; בפרו קופלAI זוכר אותך בין מפגשים ומפיק תובנות אישיות.' }, en: { q: 'Free vs Pro?', a: 'Free lets you talk; Pro remembers you between sessions and builds personal insights.' } },
  { he: { q: 'מי זה קופל?', a: 'קופל אליעזר - פסיכואנליטיקאי שנתן לאפליקציה את שמה, רוחה ודרך החשיבה שלה.' }, en: { q: 'Who is Kopel?', a: 'Kopel Eliezer - a psychoanalyst who gave the app its name, spirit, and way of thinking.' } },
];

export default function HomePage() {
  const { language, setLanguage } = useLang();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (u) router.replace('/app/conversation');
      else setChecking(false);
    });
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-zinc-950">
        <div className="flex gap-1.5">
          {[0, 150, 300].map((d) => (
            <span key={d} className="w-2 h-2 rounded-full bg-stone-400 dark:bg-zinc-600 animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  const he = language === 'he';
  const s = he ? '-he' : '';
  const primaryBtn = 'px-6 py-3 rounded-xl bg-indigo-950 dark:bg-indigo-600 text-white text-center font-medium hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors shadow-sm';
  const ghostBtn = 'px-6 py-3 rounded-xl border border-stone-300 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 text-center hover:bg-white dark:hover:bg-zinc-900 transition-colors';

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 text-stone-900 dark:text-zinc-100">
      {/* Nav */}
      <header className="sticky top-0 z-10 bg-stone-50/80 dark:bg-zinc-950/80 backdrop-blur border-b border-stone-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-950 dark:bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm leading-none">K</span>
            </div>
            <span className="font-semibold">KopelAi</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLanguage(he ? 'en' : 'he')} className="text-sm text-stone-500 dark:text-zinc-500 hover:text-stone-800 dark:hover:text-zinc-200 px-2 py-1.5 rounded-lg transition-colors">
              {he ? 'English' : 'עברית'}
            </button>
            <Link href="/auth/signin" className="text-sm px-3 py-1.5 rounded-lg text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-900 transition-colors">{he ? 'התחברות' : 'Sign in'}</Link>
            <Link href="/auth/signup" className="text-sm px-3 py-1.5 rounded-lg bg-indigo-950 dark:bg-indigo-600 text-white hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors">{he ? 'התחל עכשיו' : 'Get started'}</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-5 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <span className="inline-block text-xs font-medium px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300">
            {he ? 'תומך מפגש למטפלים' : 'A session companion for therapists'}
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mt-6 mb-4">{he ? 'אני-אתה' : 'I-Thou'}</h1>
          <p className="text-lg italic text-stone-600 dark:text-zinc-300 max-w-lg mx-auto mb-5" style={{ fontFamily: 'Georgia, serif' }}>
            {he ? '״כל חיים אמיתיים הם פגישה.״' : '"All real living is meeting."'}{' '}
            <span className="text-stone-400 dark:text-zinc-500 not-italic text-base">{he ? '- מרטין בובר' : '- Martin Buber'}</span>
          </p>
          <p className="text-lg text-stone-500 dark:text-zinc-400 leading-relaxed max-w-xl mx-auto mb-8">
            {he
              ? 'מרחב רפלקציה פרטי שעוזר לך להגיע למטופל מדויק יותר, קוהרנטי יותר, מעובד יותר - לצד הבנת עצמך כמטפל.'
              : 'A private reflective space that helps you meet your client more precisely, more coherently, more worked-through - alongside understanding yourself as a therapist.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/signup" className={primaryBtn}>{he ? 'התחל שיחה - חינם' : 'Start a conversation - free'}</Link>
            <Link href="/auth/signin" className={ghostBtn}>{he ? 'יש לי כבר חשבון' : 'I already have an account'}</Link>
          </div>
          <p className="text-xs text-stone-400 dark:text-zinc-600 mt-5">
            🔒 {he ? 'פרטי ומוצפן · בהשראת הפסיכואנליטיקאי קופל אליעזר' : 'Private and encrypted · inspired by the psychoanalyst Kopel Eliezer'}
          </p>
        </div>
      </section>

      {/* Pillars */}
      <section className="px-5 py-14 bg-white dark:bg-zinc-900 border-y border-stone-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-5">
          {PILLARS.map((p) => {
            const c = he ? p.he : p.en;
            return (
              <div key={c.title}>
                <div className="w-11 h-11 rounded-xl bg-stone-100 dark:bg-zinc-800 flex items-center justify-center text-indigo-700 dark:text-indigo-400 mb-3">{p.icon}</div>
                <h3 className="font-semibold text-lg mb-1">{c.title}</h3>
                <p className="text-stone-500 dark:text-zinc-400 text-sm leading-relaxed">{c.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="px-5 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight mb-1">{he ? 'איך זה עובד' : 'How it works'}</h2>
          <p className="text-stone-500 dark:text-zinc-400 mb-8">{he ? 'ארבעה צעדים, מעגל שחוזר ומעמיק.' : 'Four steps, a loop that deepens over time.'}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((step, i) => {
              const c = he ? step.he : step.en;
              return (
                <div key={i} className="rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
                  <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-2">{String(i + 1).padStart(2, '0')}</div>
                  <h3 className="font-semibold mb-1">{c.t}</h3>
                  <p className="text-sm text-stone-500 dark:text-zinc-400 leading-relaxed">{c.b}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Who you are */}
      <section className="px-5 py-16 bg-white dark:bg-zinc-900 border-y border-stone-200 dark:border-zinc-800">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight mb-6">{he ? 'מי אתה?' : 'Is this for you?'}</h2>
          <div className="space-y-4">
            {AUDIENCE.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                </div>
                <p className="text-stone-600 dark:text-zinc-300 leading-relaxed text-[15px]">{he ? a.he : a.en}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Credibility */}
      <section className="px-5 py-14 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm text-stone-400 dark:text-zinc-600 mb-2">{he ? 'העומק שמאחורי השיחה' : 'The depth behind the conversation'}</p>
          <p className="text-lg leading-relaxed">
            {he
              ? <>עדשה פסיכואנליטית-אינטרסובייקטיבית, כלים מתוך הלוגותרפיה של פרנקל, ומאגר של <span className="font-semibold">77 הרצאות</span> של קופל אליעזר - שקופלAI ממליץ עליהן כשהן מתאימות לשיחה.</>
              : <>A psychoanalytic, intersubjective lens, tools from Frankl's logotherapy, and a library of <span className="font-semibold">77 lectures</span> by Kopel Eliezer - which KopelAi recommends when they fit the conversation.</>}
          </p>
        </div>
      </section>

      {/* People */}
      <section className="px-5 py-16 bg-white dark:bg-zinc-900 border-y border-stone-200 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight mb-6">{he ? 'מי עומד מאחורי קופלAI' : "Who's behind KopelAi"}</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {PEOPLE.map((person) => {
              const c = he ? person.he : person.en;
              return (
                <div key={person.key} className="flex items-center gap-4 rounded-2xl border border-stone-200 dark:border-zinc-800 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={person.photo} alt={c.name} className="w-16 h-16 rounded-2xl object-cover shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-sm text-indigo-700 dark:text-indigo-400 mb-1">{c.role}</div>
                    <p className="text-sm text-stone-500 dark:text-zinc-400 leading-relaxed">{c.line}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-5 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight mb-2 text-center">{he ? 'תוכניות' : 'Plans'}</h2>
          <p className="text-center text-stone-500 dark:text-zinc-400 max-w-lg mx-auto mb-7 text-[15px]">
            {he
              ? 'כאילו שילמת על מפגש אחד בחודש - ומקבלים את קופלAI תמיד, מסביב לשעון.'
              : 'About the price of one therapy hour a month - and you get KopelAi always, around the clock.'}
          </p>
          <div className="grid sm:grid-cols-2 gap-5">
            {/* Free */}
            <div className="rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
              <div className="font-semibold">{he ? 'חינם' : 'Free'}</div>
              <div className="text-3xl font-bold my-2">{he ? '₪0' : '$0'}</div>
              <ul className="space-y-2 mt-3 text-sm">
                <li className="text-stone-700 dark:text-zinc-300">✓ {he ? 'שיחה מלאה עם קופלAI' : 'Full conversation with KopelAi'}</li>
                <li className="text-stone-400 dark:text-zinc-600">✕ {he ? 'ללא זיכרון בין מפגשים' : 'No memory between sessions'}</li>
                <li className="text-stone-400 dark:text-zinc-600">✕ {he ? 'ללא עמוד תובנות' : 'No insights page'}</li>
              </ul>
              <Link href="/auth/signup" className="block text-center mt-5 px-4 py-2.5 rounded-xl border border-stone-300 dark:border-zinc-700 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors text-sm font-medium">{he ? 'התחל בחינם' : 'Start free'}</Link>
            </div>
            {/* Pro */}
            <div className="rounded-2xl border-2 border-indigo-500 bg-white dark:bg-zinc-900 p-6">
              <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300">{he ? 'הכי פופולרי' : 'Most popular'}</span>
              <div className="font-semibold mt-3">{he ? 'פרו' : 'Pro'}</div>
              <div className="flex items-baseline gap-2 my-2">
                <span className="text-3xl font-bold">₪99</span>
                <span className="text-sm font-normal text-stone-500 dark:text-zinc-400">{he ? '/ חודש' : '/ mo'}</span>
              </div>
              <p className="text-xs text-stone-500 dark:text-zinc-400 -mt-1 mb-1">{he ? 'פחות משליש ממחיר מפגש אחד · כולל מע"מ' : 'Less than a third of one session · VAT incl.'}</p>
              <ul className="space-y-2 mt-3 text-sm text-stone-700 dark:text-zinc-300">
                <li>✓ {he ? 'זיכרון מלא בין מפגשים' : 'Full memory between sessions'}</li>
                <li>✓ {he ? 'תובנות אישיות מתמשכות' : 'Ongoing personal insights'}</li>
                <li>✓ {he ? 'חשבונית מס · ביטול בלחיצה' : 'Tax invoice · cancel anytime'}</li>
              </ul>
              <Link href="/auth/signup" className="block text-center mt-5 px-4 py-2.5 rounded-xl bg-indigo-950 dark:bg-indigo-600 text-white hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors text-sm font-medium">{he ? 'שדרג לפרו' : 'Upgrade to Pro'}</Link>
            </div>
          </div>
          <p className="text-xs text-center text-stone-400 dark:text-zinc-600 mt-4">
            {he
              ? <>שנתי: <span className="font-medium text-stone-500 dark:text-zinc-400">₪990</span> במקום <span className="line-through">₪1,188</span> - כחודשיים מתנה.</>
              : <>Annual: <span className="font-medium text-stone-500 dark:text-zinc-400">₪990</span> instead of <span className="line-through">₪1,188</span> - about two months free.</>}
          </p>
          <div className="mt-5 flex justify-center">
            <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-sm font-medium shadow-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
              </svg>
              <span>
                {he
                  ? <><strong className="font-bold">מחיר השקה ראשוני וזמני</strong> - עשוי להתעדכן בהמשך. המצטרפים עכשיו נשארים במחיר הזה.</>
                  : <><strong className="font-bold">Introductory launch price</strong> - may change later. Join now and keep this price.</>}
              </span>
            </div>
          </div>
          <p className="text-xs text-center text-stone-500 dark:text-zinc-400 mt-3">
            {he
              ? <>סטודנטים ומתמחים: יש קוד הטבה - לקבלתו <a href="/contact-he" className="underline hover:text-stone-700 dark:hover:text-zinc-200">פנו ישירות לשי או לקופל</a>.</>
              : <>Students & trainees: a discount code is available - <a href="/contact" className="underline hover:text-stone-700 dark:hover:text-zinc-200">reach out to Shai or Kopel directly</a> to get it.</>}
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-5 py-16 bg-white dark:bg-zinc-900 border-y border-stone-200 dark:border-zinc-800">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight mb-6">{he ? 'שאלות נפוצות' : 'Frequently asked'}</h2>
          <div className="space-y-5">
            {FAQ.map((f, i) => {
              const c = he ? f.he : f.en;
              return (
                <div key={i}>
                  <p className="font-medium mb-1">{c.q}</p>
                  <p className="text-sm text-stone-500 dark:text-zinc-400 leading-relaxed">{c.a}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 py-16 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight mb-3">{he ? 'תורך לשבת מולך' : 'Your turn to sit across from yourself'}</h2>
          <p className="text-stone-500 dark:text-zinc-400 mb-6">{he ? 'מי שמחזיק אחרים, ראוי למקום להישען בו. התחל שיחה - חינם.' : 'Those who hold others deserve a place to lean. Start a conversation - free.'}</p>
          <Link href="/auth/signup" className={`inline-block ${primaryBtn}`}>{he ? 'התחל שיחה עם קופלAI' : 'Start a conversation with KopelAi'}</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-5 py-8 border-t border-stone-200 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-stone-400 dark:text-zinc-600">
          <a href={`/about${s}`} className="hover:text-stone-600 dark:hover:text-zinc-400 transition-colors">{he ? 'אודות' : 'About'}</a>
          <a href={`/contact${s}`} className="hover:text-stone-600 dark:hover:text-zinc-400 transition-colors">{he ? 'יצירת קשר' : 'Contact'}</a>
          <a href={`/privacy${s}`} className="hover:text-stone-600 dark:hover:text-zinc-400 transition-colors">{he ? 'פרטיות' : 'Privacy'}</a>
          <a href={`/terms${s}`} className="hover:text-stone-600 dark:hover:text-zinc-400 transition-colors">{he ? 'תנאי שימוש' : 'Terms'}</a>
          <span>· {he ? 'מופעל על ידי שי חי גיאן' : 'Made by Shai Hay Gian'}</span>
        </div>
      </footer>
    </div>
  );
}
