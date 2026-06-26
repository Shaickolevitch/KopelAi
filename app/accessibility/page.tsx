'use client';

import Link from 'next/link';
import { useLang } from '@/lib/i18n';

export default function AccessibilityStatement() {
  const { language } = useLang();
  const he = language === 'he';

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 text-stone-900 dark:text-zinc-100">
      <div className="max-w-2xl mx-auto px-5 py-12">
        <Link href="/" className="text-sm text-stone-400 dark:text-zinc-500 hover:text-stone-700 dark:hover:text-zinc-300">
          {he ? '→ חזרה לדף הבית' : '← Back home'}
        </Link>

        <h1 className="text-3xl font-bold mt-4 mb-2">{he ? 'הצהרת נגישות' : 'Accessibility statement'}</h1>
        <p className="text-sm text-stone-400 dark:text-zinc-500 mb-8">{he ? 'עודכן לאחרונה: יוני 2026' : 'Last updated: June 2026'}</p>

        <div className="space-y-6 text-[0.94rem] leading-relaxed text-stone-700 dark:text-zinc-300">
          {he ? (
            <>
              <p>
                ב־KopelAi (קופלAI) אנו רואים חשיבות רבה במתן שירות שוויוני ונגיש לכלל המשתמשים, לרבות אנשים עם מוגבלות.
                אנו פועלים כדי שהאתר והאפליקציה יהיו נגישים ככל הניתן, מתוך אמונה שלכל אדם מגיעה הזכות להשתמש בשירות בכבוד, בעצמאות ובנוחות.
              </p>

              <section>
                <h2 className="text-lg font-semibold mb-1.5">רמת הנגישות באתר</h2>
                <p>
                  אנו שואפים לעמוד בדרישות תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), ובהתאם לתקן הישראלי ת"י 5568 המבוסס על הנחיות WCAG 2.1 ברמה AA.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-1.5">מה הונגש</h2>
                <ul className="list-disc ps-5 space-y-1">
                  <li>תפריט נגישות (הכפתור בפינת המסך): הגדלה והקטנה של גודל הטקסט, ניגודיות גבוהה, הדגשת קישורים, ריווח קריא, סמן גדול, מדריך קריאה ועצירת אנימציות. ההעדפות נשמרות בין עמודים.</li>
                  <li>מבנה כותרות הגיוני, ניווט באמצעות מקלדת, וטקסט חלופי לתמונות מהותיות.</li>
                  <li>תמיכה במצב כהה ובהיר, וכיבוד העדפת המערכת ל"הפחתת תנועה".</li>
                  <li>האתר בנוי כ־RTL ומותאם לעברית.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-1.5">החרגות ומגבלות</h2>
                <p>
                  למרות מאמצינו, ייתכן שחלקים מסוימים באתר טרם הונגשו במלואם, או שיתגלו רכיבים הדורשים שיפור. אנו ממשיכים לפעול לשיפור הנגישות באופן שוטף.
                  אם נתקלתם בקושי או בתקלת נגישות, נשמח לדעת ולתקן.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-1.5">פנייה בנושא נגישות</h2>
                <p>רכז הנגישות: שי חי גיאן</p>
                <p>דוא"ל: <a dir="ltr" className="text-indigo-700 dark:text-indigo-400 underline" href="mailto:shaigian1@gmail.com">shaigian1@gmail.com</a></p>
                <p>טלפון: <span dir="ltr">050-204-2507</span></p>
                <p className="text-sm text-stone-500 dark:text-zinc-400 mt-1">בפנייה נשמח לקבל פירוט של הבעיה, העמוד שבו אירעה, וסוג הדפדפן/המכשיר.</p>
              </section>
            </>
          ) : (
            <>
              <p>
                At KopelAi we are committed to providing an equal, accessible service to all users, including people with disabilities.
                We work to make the website and app as accessible as possible, in the belief that everyone deserves to use the service with dignity, independence and ease.
              </p>

              <section>
                <h2 className="text-lg font-semibold mb-1.5">Level of accessibility</h2>
                <p>
                  We strive to meet the requirements of the Israeli Equal Rights for Persons with Disabilities regulations and Israeli Standard IS 5568, based on the WCAG 2.1 Level AA guidelines.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-1.5">What has been made accessible</h2>
                <ul className="list-disc ps-5 space-y-1">
                  <li>An accessibility menu (the corner button): larger/smaller text, high contrast, link highlighting, readable spacing, big cursor, a reading guide, and pausing animations. Preferences persist across pages.</li>
                  <li>A logical heading structure, keyboard navigation, and alt text for meaningful images.</li>
                  <li>Light and dark modes, and respect for the system "reduce motion" preference.</li>
                  <li>The site is built RTL and tailored to Hebrew.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-1.5">Limitations</h2>
                <p>
                  Despite our efforts, some parts of the site may not yet be fully accessible, or components may be found that need improvement. We continually work to improve accessibility. If you encounter any difficulty, we’d like to know and fix it.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-1.5">Accessibility contact</h2>
                <p>Accessibility coordinator: Shai Hay Gian</p>
                <p>Email: <a dir="ltr" className="text-indigo-700 dark:text-indigo-400 underline" href="mailto:shaigian1@gmail.com">shaigian1@gmail.com</a></p>
                <p>Phone: <span dir="ltr">050-204-2507</span></p>
                <p className="text-sm text-stone-500 dark:text-zinc-400 mt-1">Please include the problem, the page where it occurred, and your browser/device.</p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
