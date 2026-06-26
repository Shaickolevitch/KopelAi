'use client';

import { useState } from 'react';
import { useLang } from '@/lib/i18n';

// The two people behind KopelAi - expanded version of the homepage section.
// To add real photos: drop the image files into /public (e.g. /public/kopel.jpg,
// /public/shai.png) and set `photo` below. Edit the bios freely - they're placeholders.
const PEOPLE = [
  {
    key: 'kopel',
    photo: '/kopel.jpg',
    contact: '052-583-8686' as string | null,
    website: null as string | null,
    he: {
      name: 'קופל אליעזר',
      role: 'פסיכואנליטיקאי',
      bio: [
        'אני קופל אליעזר, אנליטיקאי עצמאי, הפועל מתוך הבנה שהאדם מתגלה ומתעצב בתוך קשר חי, נוכח ומורכב.',
        'עבודתי - כמטפל, כמדריך וכיוצר תוכן - נשענת על הפסיכואנליזה הבין-אישית, ומתמקדת בדיאלוג פתוח שבו הקשר קודם לפרשנות, הפעולה הטיפולית חשובה, והנוכחות היא חלק מהטכניקה.',
        'אני עובד סוציאלי קליני, מקבל בקליניקה שלי במרכז תל אביב, ברחוב בן יהודה 32, ומוביל מרחבי למידה מקצועיים - ביניהם מפעל הלמידה בפייסבוק "פסיכואנליזה בין שעה לשעה".',
      ],
    },
    en: {
      name: 'Kopel Eliezer',
      role: 'Psychoanalyst',
      bio: [
        'I’m Kopel Eliezer, an independent analyst, working from the understanding that a person is revealed and shaped within a living, present, and complex relationship.',
        'My work - as a therapist, supervisor, and content creator - rests on interpersonal psychoanalysis, and centers on an open dialogue in which the relationship comes before interpretation, the therapeutic act matters, and presence is part of the technique.',
        'I’m a clinical social worker, seeing clients at my clinic in central Tel Aviv, on 32 Ben Yehuda St., and I lead professional learning spaces - among them the Facebook learning project "Psychoanalysis, Hour by Hour".',
      ],
    },
  },
  {
    key: 'shai',
    photo: '/shai.png',
    contact: '050-204-2507 · shaigian1@gmail.com',
    website: 'https://www.shaigian.com',
    he: {
      name: 'שי חי גיאן',
      role: 'המייסד והמפתח',
      bio: [
        'אני שי חי גיאן, היזם והמפתח של קופלAI. אני מאמין שמטפלים זקוקים למרחב פרטי לעצור, לחשוב, ולהבין את עצמם - לצד הבנת המטופלים.',
        'לקחתי את הדרך שבה קופל מתבונן בנפש, והפכתי אותה למרחב אישי ומתמשך שכל מטפל יכול לחזור אליו בין מפגש למפגש.',
        'אני גם מלווה תהליכים אישיים בפורמט שנקרא "חברותא לעשייה".',
      ],
    },
    en: {
      name: 'Shai Hay Gian',
      role: 'Founder & developer',
      bio: [
        'I’m Shai Hay Gian, the founder and developer of KopelAi. I believe therapists need a private space to pause, reflect, and understand themselves - alongside understanding their clients.',
        'I took the way Kopel looks at the psyche and turned it into a personal, ongoing space any therapist can return to between sessions.',
        'I also accompany personal processes in a format called "Chevruta for Action" (חברותא לעשייה).',
      ],
    },
  },
];

export default function AboutUsPage() {
  const { language } = useLang();
  const isHebrew = language === 'he';

  return (
    <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-zinc-100 mb-2 tracking-tight">
        {isHebrew ? 'מי אנחנו' : 'Who we are'}
      </h1>
      <p className="text-stone-500 dark:text-zinc-400 mb-4">
        {isHebrew
          ? 'קופלAI הוא בינה מלאכותית שיצרנו קופל אליעזר ושי חי גיאן, במטרה להרחיב את המגע של מטפלים עם החשיבה הפסיכואנליטית.'
          : 'KopelAi is an AI created by Kopel Eliezer and Shai Hay Gian, to expand therapists’ contact with psychoanalytic thinking.'}
      </p>
      <p className="text-stone-600 dark:text-zinc-300 mb-10 leading-relaxed">
        <span className="font-semibold text-stone-800 dark:text-zinc-100">
          {isHebrew ? 'תומך מפגש' : 'Session support'}
        </span>
        {isHebrew
          ? ' - קופלAI עוזר לך כמטפל להגיע למטופל מדויק יותר, קוהרנטי יותר, מעובד יותר.'
          : ' - KopelAi helps you, as a therapist, meet your client more precisely, more coherently, more worked-through.'}
      </p>

      <div className="space-y-10">
        {PEOPLE.map((person) => {
          const copy = isHebrew ? person.he : person.en;
          return (
            <div key={person.key} className="flex flex-col sm:flex-row gap-5 sm:items-start">
              <PersonPhoto src={person.photo} name={copy.name} />

              <div className="min-w-0">
                <div className="font-semibold text-lg text-stone-900 dark:text-zinc-100">{copy.name}</div>
                <div className="text-sm text-indigo-700 dark:text-indigo-400 mb-3">{copy.role}</div>
                <div className="space-y-3 text-stone-600 dark:text-zinc-400 text-[15px] leading-relaxed">
                  {copy.bio.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
                {person.contact && (
                  <div className="mt-3 text-sm text-stone-500 dark:text-zinc-500">
                    {isHebrew ? 'ליצירת קשר: ' : 'Contact: '}
                    <span dir="ltr" className="inline-block align-middle">{person.contact}</span>
                  </div>
                )}
                {person.website && (
                  <div className="mt-1 text-sm text-stone-500 dark:text-zinc-500">
                    {isHebrew ? 'אתר: ' : 'Website: '}
                    <a
                      href={person.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      dir="ltr"
                      className="inline-block align-middle text-indigo-700 dark:text-indigo-400 underline underline-offset-2 hover:opacity-80"
                    >
                      {person.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Person photo that degrades to a clean initials avatar if the image is missing
// or fails to load (e.g. a photo file that isn't in /public yet).
function PersonPhoto({ src, name }: { src?: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const showImg = src && !failed;
  if (showImg) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src!}
        alt={name}
        onError={() => setFailed(true)}
        className="w-28 h-28 rounded-2xl object-cover shrink-0 shadow-sm self-center sm:self-start"
      />
    );
  }
  const initial = name.trim().charAt(0) || '?';
  return (
    <div
      className="w-28 h-28 rounded-2xl shrink-0 flex items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-950 dark:to-indigo-900 text-indigo-800 dark:text-indigo-300 text-4xl font-semibold self-center sm:self-start shadow-sm"
      aria-label={name}
    >
      {initial}
    </div>
  );
}
