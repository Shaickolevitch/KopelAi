'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLang } from '@/lib/i18n';
import { getPatients, ProRequiredError, type Patient } from '@/lib/api';

function Locked() {
  const { language } = useLang();
  const he = language === 'he';
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="max-w-md text-center opacity-90">
        <div className="w-16 h-16 rounded-2xl bg-stone-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400 dark:text-zinc-500">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-stone-700 dark:text-zinc-300 mb-3">
          {he ? 'אפשרות זו פתוחה למשתמשי פרו' : 'This is open to Pro members'}
        </h2>
        <p className="text-stone-500 dark:text-zinc-500 leading-relaxed mb-6 text-sm">
          {he
            ? 'עמוד המטופלים אוסף בשקט את מה שאתה משתף על כל מטופל לאורך זמן, ובונה לך ניתוח רפלקטיבי נפרד לכל אחד.'
            : 'The patients space quietly gathers what you share about each client over time, and builds you a separate reflective analysis for each.'}
        </p>
        <Link
          href="/app/plan"
          className="inline-block px-6 py-3 rounded-xl bg-indigo-950 dark:bg-indigo-600 text-white font-medium hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors"
        >
          {he ? 'שדרג לפרו' : 'Upgrade to Pro'}
        </Link>
      </div>
    </div>
  );
}

function Dots() {
  return (
    <div className="py-12 flex justify-center">
      <div className="flex gap-1.5">
        {[0, 150, 300].map((d) => (
          <span key={d} className="w-2 h-2 rounded-full bg-stone-300 dark:bg-zinc-700 animate-bounce" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  );
}

export default function PatientList() {
  const { language } = useLang();
  const he = language === 'he';
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [q, setQ] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const rows = await getPatients();
        setPatients(rows);
      } catch (e) {
        if (e instanceof ProRequiredError) setLocked(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return patients.filter((p) => {
      if (!showArchived && p.archived) return false;
      if (ql) {
        const hay = `${p.name} ${(p.aliases ?? []).join(' ')} ${p.notes ?? ''}`.toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
  }, [patients, q, showArchived]);

  function fmt(iso: string | null | undefined) {
    if (!iso) return he ? 'אין עדיין' : 'none yet';
    return new Date(iso).toLocaleDateString(he ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  if (loading) return <Dots />;
  if (locked) return <Locked />;

  const archivedCount = patients.filter((p) => p.archived).length;

  if (patients.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-stone-500 dark:text-zinc-400 text-sm max-w-md mx-auto leading-relaxed mb-2">
          {he
            ? 'כאן יופיעו המטופלים שלך. בכל פעם שאתה מזכיר מטופל בשם או בכינוי בשיחה עם קופל, הוא מזהה אותו וקושר אליו את השיחה — ובונה לו ניתוח משלו.'
            : 'Your patients will appear here. Whenever you mention a client by name or nickname in a conversation with Kopel, he recognizes them, links the session, and builds them their own analysis.'}
        </p>
        <p className="text-xs text-stone-400 dark:text-zinc-600 italic max-w-md mx-auto leading-relaxed">
          {he
            ? 'תזכורת: שמור על אנונימיות — כינוי או שם פרטי מספיקים. זה התיק הרפלקטיבי הפרטי שלך, לא רשומה קלינית.'
            : 'A reminder: keep it anonymous — a nickname or first name is enough. This is your private reflective file, not a clinical record.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={he ? 'חיפוש מטופל…' : 'Search patients…'}
          className="flex-1 min-w-[160px] px-3 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-stone-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-900/20 dark:focus:ring-indigo-500/30"
        />
        {archivedCount > 0 && (
          <button
            onClick={() => setShowArchived((v) => !v)}
            className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              showArchived
                ? 'bg-clay/10 text-clay border-clay/30'
                : 'text-stone-400 dark:text-zinc-500 border-stone-200 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-800'
            }`}
          >
            {he ? `כולל בארכיון (${archivedCount})` : `Show archived (${archivedCount})`}
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-stone-400 dark:text-zinc-600 text-sm">
          {he ? 'לא נמצאו מטופלים.' : 'No patients found.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/app/patients/${p.id}`}
              className={`block rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3.5 hover:bg-stone-50 dark:hover:bg-zinc-800/50 transition-colors ${p.archived ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-lg shrink-0">
                  {p.emoji || '🫧'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-900 dark:text-zinc-100 truncate">{p.name}</span>
                    {p.archived && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 dark:bg-zinc-800 text-stone-400 dark:text-zinc-500">
                        {he ? 'ארכיון' : 'archived'}
                      </span>
                    )}
                  </div>
                  {p.notes && <p className="text-xs text-stone-400 dark:text-zinc-500 truncate">{p.notes}</p>}
                </div>
                <span aria-hidden className="text-stone-300 dark:text-zinc-600">{he ? '‹' : '›'}</span>
              </div>
              <div className="flex items-center gap-3 mt-2.5 text-xs text-stone-400 dark:text-zinc-600">
                <span>{p.session_count ?? 0} {he ? 'מפגשים' : 'sessions'}</span>
                <span>·</span>
                <span>{he ? 'אחרון' : 'last'}: {fmt(p.last_session_at)}</span>
                {p.analysis_generated_at && (
                  <span className="ms-auto px-2 py-0.5 rounded-full bg-clay/10 text-clay">{he ? 'נותח' : 'analyzed'}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
