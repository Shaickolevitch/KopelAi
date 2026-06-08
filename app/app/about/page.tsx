'use client';

import { useLang } from '@/lib/i18n';

// The two people behind KopelAi — expanded version of the homepage section.
// To add real photos: drop the image files into /public (e.g. /public/kopel.jpg,
// /public/shai.jpg) and set `photo` below. Edit the bios freely — they're placeholders.
const PEOPLE = [
  {
    key: 'kopel',
    photo: null as string | null, // e.g. '/kopel.jpg'
    he: {
      name: 'קופל אליעזר',
      role: 'ההשראה',
      bio: [
        'קופל אליעזר הוא פסיכולוג ומורה, בגישה פסיכואנליטית-אינטרסובייקטיבית. לאורך שנים ליווה מטפלים והעביר עשרות הרצאות על מושגי היסוד של הנפש — מהלא-מודע, דרך יחסי אובייקט, ועד למרחב הפוטנציאלי.',
        'הגישה שלו מתבוננת, אנושית וישירה. בלבה עומדת אמונה אחת: הכלי המרכזי של המטפל הוא המטפל עצמו — ולכן ההיכרות של מטפל עם עצמו היא העבודה החשובה ביותר שיש.',
        'קופלAI נבנה בהשראת הקול, החשיבה והתורה שלו — כדי להנגיש את הדרך שבה הוא חושב על אנשים, ולהביא אותה לכל מטפל. [טקסט זמני — ניתן לעריכה]',
      ],
    },
    en: {
      name: 'Kopel Eliezer',
      role: 'The inspiration',
      bio: [
        'Kopel Eliezer is a psychologist and teacher working in the psychoanalytic, intersubjective tradition. Over many years he has mentored therapists and given dozens of lectures on the core concepts of the psyche — from the unconscious, through object relations, to the potential space.',
        'His approach is reflective, human, and direct. At its heart is a single conviction: the therapist’s main instrument is the therapist themselves — which makes knowing yourself the most important work there is.',
        'KopelAi is built in the spirit of his voice, his thinking, and his teaching — to make the way he thinks about people accessible to every therapist. [placeholder — editable]',
      ],
    },
  },
  {
    key: 'shai',
    photo: null as string | null, // e.g. '/shai.jpg'
    he: {
      name: 'שי חי גיאן',
      role: 'המייסד',
      bio: [
        'שי חי גיאן הוא היזם והמפתח שמאחורי קופלAI. הוא בנה את האפליקציה מתוך אמונה שמטפלים זקוקים למרחב פרטי לעצור, לחשוב, ולהבין את עצמם — לצד הבנת המטופלים.',
        'המטרה פשוטה: לקחת את הדרך שבה קופל מתבונן בנפש, ולהפוך אותה למרחב אישי ומתמשך שכל מטפל יכול לחזור אליו בין מפגש למפגש. [טקסט זמני — ניתן לעריכה]',
      ],
    },
    en: {
      name: 'Shai Hay Gian',
      role: 'The founder',
      bio: [
        'Shai Hay Gian is the founder and developer behind KopelAi. He built the app out of a belief that therapists need a private space to pause, reflect, and understand themselves — not only their clients.',
        'The goal is simple: take the way Kopel looks at the psyche and turn it into a personal, ongoing space any therapist can return to between sessions. [placeholder — editable]',
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
          ? 'שני אנשים, וכוונה אחת — מרחב מתבונן למטפלים.'
          : 'Two people, one intention — a reflective space for therapists.'}
      </p>
      <p className="text-stone-600 dark:text-zinc-300 mb-10 leading-relaxed">
        <span className="font-semibold text-stone-800 dark:text-zinc-100">
          {isHebrew ? 'תומך מפגש' : 'Session support'}
        </span>
        {isHebrew
          ? ' — קופלAI עוזר לך כמטפל להגיע למטופל מדויק יותר, קוהרנטי יותר, מעובד יותר.'
          : ' — KopelAi helps you, as a therapist, meet your client more precisely, more coherently, more worked-through.'}
      </p>

      <div className="space-y-10">
        {PEOPLE.map((person) => {
          const copy = isHebrew ? person.he : person.en;
          return (
            <div key={person.key} className="flex flex-col sm:flex-row gap-5 sm:items-start">
              {person.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={person.photo}
                  alt={copy.name}
                  className="w-28 h-28 rounded-2xl object-cover shrink-0 shadow-sm self-center sm:self-start"
                />
              ) : (
                <div
                  className="w-28 h-28 rounded-2xl shrink-0 flex items-center justify-center border-2 border-dashed border-stone-300 dark:border-zinc-700 bg-gradient-to-br from-stone-100 to-stone-200 dark:from-zinc-900 dark:to-zinc-800 text-stone-400 dark:text-zinc-600 self-center sm:self-start"
                  aria-label={isHebrew ? 'מקום לתמונה' : 'Photo placeholder'}
                >
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              )}

              <div className="min-w-0">
                <div className="font-semibold text-lg text-stone-900 dark:text-zinc-100">{copy.name}</div>
                <div className="text-sm text-indigo-700 dark:text-indigo-400 mb-3">{copy.role}</div>
                <div className="space-y-3 text-stone-600 dark:text-zinc-400 text-[15px] leading-relaxed">
                  {copy.bio.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
