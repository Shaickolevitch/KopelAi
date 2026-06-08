import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-zinc-950 px-6" dir="rtl">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 rounded-xl bg-indigo-950 dark:bg-indigo-600 flex items-center justify-center mx-auto mb-5">
          <span className="text-white font-bold text-lg leading-none">K</span>
        </div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-zinc-100 mb-2">
          הדף לא נמצא
        </h1>
        <p className="text-stone-500 dark:text-zinc-400 mb-6 text-sm">
          הקישור שגוי או שהדף הוסר.
        </p>
        <Link
          href="/app/conversation"
          className="inline-block px-6 py-3 rounded-xl bg-indigo-950 dark:bg-indigo-600 text-white font-medium hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors"
        >
          חזרה לקופלAI
        </Link>
      </div>
    </div>
  );
}
