'use client';

import { useState } from 'react';
import { useLang } from '@/lib/i18n';

const STEPS_HE = [
  {
    title: 'ברוך הבא לקופל',
    body: 'זה מרחב פרטי לרפלקציה. כתוב מה שעל ליבך — אחרי מפגש קשה, מחשבה שחוזרת, או משהו שמעסיק אותך. אין נכון או לא נכון, פשוט תדבר.',
  },
  {
    title: 'סיים שיחה כדי לקבל ניתוח',
    body: 'כשתסיים, לחץ "סיים שיחה". קופל ינתח את מה שאמרת ויראה לך דפוסים, חוזקות ונקודות עיוורון בעמוד "ניתוח". ככל שתדבר יותר — התמונה מתחדדת.',
  },
  {
    title: 'פרטי ובטוח',
    body: 'השיחות שלך מוצפנות ופרטיות. קופל אינו טיפול ואינו הדרכה — זהו מרחב אישי שלך בלבד. מומלץ לשמור על אנונימיות של מטופלים (שם פרטי או "מטופל ש…").',
  },
];

const STEPS_EN = [
  {
    title: 'Welcome to KopelAi',
    body: "This is a private space to reflect. Write whatever's on your mind — after a hard session, a recurring thought, or anything weighing on you. There's no right or wrong; just talk.",
  },
  {
    title: 'End a session to get analysis',
    body: 'When you finish, tap "End session." KopelAi analyzes what you said and surfaces patterns, strengths, and blind spots on the "Analysis" page. The more you talk, the clearer it gets.',
  },
  {
    title: 'Private and safe',
    body: 'Your conversations are encrypted and private. KopelAi is not therapy or supervision — it\'s a personal space just for you. Please keep clients anonymous (a first name or "a client who…").',
  },
];

export default function Onboarding({ onClose }: { onClose: () => void }) {
  const { language } = useLang();
  const isHebrew = language === 'he';
  const steps = isHebrew ? STEPS_HE : STEPS_EN;
  const [step, setStep] = useState(0);
  const last = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-11 h-11 rounded-xl bg-indigo-950 dark:bg-indigo-600 flex items-center justify-center mb-4">
          <span className="text-white font-bold text-base leading-none">K</span>
        </div>

        <h2 className="text-lg font-semibold text-stone-900 dark:text-zinc-100 mb-2">
          {steps[step].title}
        </h2>
        <p className="text-stone-500 dark:text-zinc-400 text-sm leading-relaxed mb-5">
          {steps[step].body}
        </p>

        {/* Step dots */}
        <div className="flex gap-1.5 mb-5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-indigo-600 dark:bg-indigo-400' : 'w-1.5 bg-stone-200 dark:bg-zinc-700'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="text-sm text-stone-400 dark:text-zinc-600 hover:text-stone-600 dark:hover:text-zinc-400 transition-colors"
          >
            {isHebrew ? 'דלג' : 'Skip'}
          </button>
          <button
            onClick={() => (last ? onClose() : setStep((s) => s + 1))}
            className="px-5 py-2.5 rounded-xl bg-indigo-950 dark:bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors"
          >
            {last ? (isHebrew ? 'בוא נתחיל' : "Let's start") : isHebrew ? 'הבא' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
