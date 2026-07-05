'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLang } from '@/lib/i18n';
import {
  getPatient,
  getPatients,
  updatePatient,
  deletePatient,
  untagConversationFromPatient,
  mergePatients,
  reanalyzePatient,
  ProRequiredError,
  type Patient,
  type PatientConversation,
  type PatientAnalysis,
} from '@/lib/api';

function Dots() {
  return (
    <div className="py-16 flex justify-center">
      <div className="flex gap-1.5">
        {[0, 150, 300].map((d) => (
          <span key={d} className="w-2 h-2 rounded-full bg-stone-300 dark:bg-zinc-700 animate-bounce" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  );
}

export default function PatientDetailPage() {
  const { language } = useLang();
  const he = language === 'he';
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? '');

  const [patient, setPatient] = useState<Patient | null>(null);
  const [conversations, setConversations] = useState<PatientConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

  // Edit panel state.
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  // Merge state.
  const [merging, setMerging] = useState(false);
  const [others, setOthers] = useState<Patient[]>([]);
  const [mergeTarget, setMergeTarget] = useState('');

  const load = useCallback(async () => {
    try {
      const { patient: p, conversations: c } = await getPatient(id);
      setPatient(p);
      setConversations(c);
      setName(p.name);
      setEmoji(p.emoji ?? '');
      setNotes(p.notes ?? '');
    } catch (e) {
      if (e instanceof ProRequiredError) router.replace('/app/plan');
      else setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  async function saveEdits() {
    setSaving(true);
    setSaveErr('');
    try {
      await updatePatient(id, { name: name.trim(), emoji: emoji.trim() || null, notes });
      setEditing(false);
      await load();
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function toggleArchive() {
    if (!patient) return;
    await updatePatient(id, { archived: !patient.archived });
    await load();
  }

  async function doDelete() {
    const msg = he
      ? 'למחוק את המטופל? השיחות עצמן יישארו, רק התיק והקישורים יימחקו.'
      : 'Delete this patient? The conversations themselves stay — only the file and its links are removed.';
    if (!window.confirm(msg)) return;
    await deletePatient(id);
    router.push('/app/patients');
  }

  async function doReanalyze() {
    setReanalyzing(true);
    try {
      const { analysis, analysis_generated_at } = await reanalyzePatient(id);
      setPatient((p) => (p ? { ...p, analysis, analysis_generated_at } : p));
    } catch {
      // swallow; button re-enables
    } finally {
      setReanalyzing(false);
    }
  }

  async function untag(conversationId: string) {
    const msg = he ? 'להסיר את השיוך של השיחה הזו מהמטופל?' : 'Remove this conversation from the patient?';
    if (!window.confirm(msg)) return;
    await untagConversationFromPatient(id, conversationId);
    await load();
  }

  async function openMerge() {
    setMerging(true);
    try {
      const all = await getPatients();
      setOthers(all.filter((p) => p.id !== id && !p.archived));
    } catch {
      setOthers([]);
    }
  }

  async function doMerge() {
    if (!mergeTarget) return;
    const msg = he
      ? 'למזג את המטופל הזה לתוך המטופל שנבחר? כל השיחות יעברו, והתיק הזה יימחק.'
      : 'Merge this patient into the selected one? All conversations move over and this file is removed.';
    if (!window.confirm(msg)) return;
    await mergePatients(id, mergeTarget);
    router.push(`/app/patients/${mergeTarget}`);
  }

  function fmtDate(iso: string | null) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString(he ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  if (loading) return <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6"><Dots /></div>;

  if (notFound || !patient) {
    return (
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-stone-500 dark:text-zinc-400 mb-4">{he ? 'המטופל לא נמצא.' : 'Patient not found.'}</p>
        <Link href="/app/patients" className="text-clay hover:underline text-sm">
          {he ? '→ חזרה למטופלים' : '← Back to patients'}
        </Link>
      </div>
    );
  }

  const a: PatientAnalysis = patient.analysis ?? {};
  const hasAnalysis =
    !!a.client_picture || !!a.processes_over_time || !!a.therapeutic_relationship ||
    (a.your_strengths?.length ?? 0) > 0 || (a.your_blind_spots?.length ?? 0) > 0 ||
    (a.reinforcements?.length ?? 0) > 0 || (a.open_threads?.length ?? 0) > 0 ||
    (a.questions_next?.length ?? 0) > 0;

  return (
    <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6">
      <Link href="/app/patients" className="text-sm text-stone-400 dark:text-zinc-600 hover:text-stone-600 dark:hover:text-zinc-400 transition-colors">
        {he ? '→ מטופלים' : '← Patients'}
      </Link>

      {/* Header */}
      <div className="mt-3 flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-2xl shrink-0">
          {patient.emoji || '🫧'}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-zinc-100 flex items-center gap-2 flex-wrap">
            {patient.name}
            {patient.archived && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-zinc-800 text-stone-400 dark:text-zinc-500 font-normal">
                {he ? 'ארכיון' : 'archived'}
              </span>
            )}
          </h1>
          <p className="text-xs text-stone-400 dark:text-zinc-600 mt-1">
            {conversations.length} {he ? 'מפגשים מקושרים' : 'linked sessions'}
            {patient.analysis_generated_at && ` · ${he ? 'נותח' : 'analyzed'} ${fmtDate(patient.analysis_generated_at)}`}
          </p>
          {patient.notes && !editing && (
            <p className="text-sm text-stone-600 dark:text-zinc-400 mt-2 leading-relaxed">{patient.notes}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-4">
        <button onClick={() => setEditing((v) => !v)}
          className="px-3 py-1.5 rounded-lg text-sm border border-stone-200 dark:border-zinc-800 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors">
          {he ? 'עריכה' : 'Edit'}
        </button>
        <button onClick={doReanalyze} disabled={reanalyzing}
          className="px-3 py-1.5 rounded-lg text-sm border border-stone-200 dark:border-zinc-800 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50">
          {reanalyzing ? (he ? 'מנתח…' : 'Analyzing…') : (he ? 'נתח מחדש' : 'Re-analyze')}
        </button>
        <button onClick={toggleArchive}
          className="px-3 py-1.5 rounded-lg text-sm border border-stone-200 dark:border-zinc-800 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors">
          {patient.archived ? (he ? 'שחזר מארכיון' : 'Unarchive') : (he ? 'העבר לארכיון' : 'Archive')}
        </button>
        <button onClick={openMerge}
          className="px-3 py-1.5 rounded-lg text-sm border border-stone-200 dark:border-zinc-800 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors">
          {he ? 'מיזוג' : 'Merge'}
        </button>
        <button onClick={doDelete}
          className="px-3 py-1.5 rounded-lg text-sm border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
          {he ? 'מחיקה' : 'Delete'}
        </button>
      </div>

      {/* Edit panel */}
      {editing && (
        <div className="mt-4 p-4 rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
          <div className="flex gap-2">
            <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4}
              placeholder="🫧" aria-label={he ? 'אימוג׳י' : 'Emoji'}
              className="w-14 text-center px-2 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-lg outline-none" />
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60}
              placeholder={he ? 'שם או כינוי' : 'Name or nickname'}
              className="flex-1 px-3 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-stone-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-900/20 dark:focus:ring-indigo-500/30" />
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={4000}
            placeholder={he ? 'הערה קצרה (לא חובה) — נשאר פרטי אצלך' : 'A short note (optional) — stays private to you'}
            className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-stone-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-900/20 dark:focus:ring-indigo-500/30 resize-none" />
          {saveErr && <p className="text-xs text-rose-500">{saveErr}</p>}
          <div className="flex gap-2">
            <button onClick={saveEdits} disabled={saving || !name.trim()}
              className="px-4 py-1.5 rounded-lg text-sm bg-indigo-950 dark:bg-indigo-600 text-white hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors disabled:opacity-50">
              {saving ? (he ? 'שומר…' : 'Saving…') : (he ? 'שמור' : 'Save')}
            </button>
            <button onClick={() => { setEditing(false); setName(patient.name); setEmoji(patient.emoji ?? ''); setNotes(patient.notes ?? ''); }}
              className="px-4 py-1.5 rounded-lg text-sm text-stone-500 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors">
              {he ? 'ביטול' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Merge panel */}
      {merging && (
        <div className="mt-4 p-4 rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
          <p className="text-sm text-stone-600 dark:text-zinc-400">
            {he ? 'מזג את המטופל הזה לתוך:' : 'Merge this patient into:'}
          </p>
          <select value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-stone-900 dark:text-zinc-100 outline-none">
            <option value="">{he ? '— בחר מטופל —' : '— choose a patient —'}</option>
            {others.map((p) => (
              <option key={p.id} value={p.id}>{p.emoji ? `${p.emoji} ` : ''}{p.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button onClick={doMerge} disabled={!mergeTarget}
              className="px-4 py-1.5 rounded-lg text-sm bg-indigo-950 dark:bg-indigo-600 text-white hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors disabled:opacity-50">
              {he ? 'מזג' : 'Merge'}
            </button>
            <button onClick={() => { setMerging(false); setMergeTarget(''); }}
              className="px-4 py-1.5 rounded-lg text-sm text-stone-500 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors">
              {he ? 'ביטול' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Analysis */}
      <div className="mt-6">
        {!hasAnalysis ? (
          <div className="py-10 text-center text-stone-400 dark:text-zinc-600 text-sm leading-relaxed">
            {conversations.length === 0
              ? (he ? 'עדיין אין מפגשים מקושרים למטופל הזה.' : 'No sessions are linked to this patient yet.')
              : (he ? 'הניתוח ייווצר אחרי המפגש הבא שתקשר למטופל — או לחץ "נתח מחדש".' : 'The analysis will appear after the next linked session — or press "Re-analyze".')}
          </div>
        ) : (
          <div className="space-y-3">
            <Prose title={he ? 'תמונת המטופל' : 'Client picture'} text={a.client_picture} />
            <Prose title={he ? 'תהליכים לאורך הזמן' : 'Processes over time'} text={a.processes_over_time} />
            <Prose title={he ? 'היחסים הטיפוליים' : 'The therapeutic relationship'} text={a.therapeutic_relationship} />
            <ListCard title={he ? 'החוזקות שלך מול המטופל הזה' : 'Your strengths with this client'} items={a.your_strengths} accent="bg-emerald-500" />
            <ListCard title={he ? 'נקודות עיוורון' : 'Blind spots'} items={a.your_blind_spots} accent="bg-amber-500" />
            <ListCard title={he ? 'חיזוקים אליך כמטפל' : 'Encouragement to you'} items={a.reinforcements} accent="bg-clay" />
            <ListCard title={he ? 'נושאים פתוחים' : 'Open threads'} items={a.open_threads} accent="bg-sky-500" />
            <ListCard title={he ? 'שאלות לקראת המפגש הבא' : 'Questions for next session'} items={a.questions_next} accent="bg-violet-500" />
          </div>
        )}
      </div>

      {/* Linked conversations */}
      {conversations.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-stone-500 dark:text-zinc-500 uppercase tracking-widest mb-2.5">
            {he ? 'מפגשים מקושרים' : 'Linked sessions'}
          </h2>
          <div className="space-y-2">
            {conversations.map((c) => (
              <div key={c.id}
                className="flex items-center gap-2 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5">
                <Link href={`/app/insights/conversation/${c.id}`} className="flex-1 min-w-0 group">
                  <span className="text-sm font-medium text-stone-900 dark:text-zinc-100 group-hover:text-clay transition-colors">
                    {fmtDate(c.started_at)}
                  </span>
                  <span className="ms-2 text-xs text-stone-400 dark:text-zinc-600">
                    {c.tag_source === 'manual' ? (he ? 'שויך ידנית' : 'tagged manually') : (he ? 'זוהה אוטומטית' : 'auto-detected')}
                  </span>
                </Link>
                <button onClick={() => untag(c.id)} title={he ? 'הסר שיוך' : 'Remove tag'}
                  className="text-xs text-stone-400 dark:text-zinc-600 hover:text-rose-500 dark:hover:text-rose-400 transition-colors px-1.5">
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="h-12" />
    </div>
  );
}

function Prose({ title, text }: { title: string; text?: string }) {
  if (!text || !text.trim()) return null;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-2xl px-4 py-4 shadow-sm">
      <h3 className="font-semibold text-stone-500 dark:text-zinc-500 mb-1.5 text-xs uppercase tracking-widest">{title}</h3>
      <p className="text-stone-800 dark:text-zinc-200 leading-relaxed text-[0.94rem] whitespace-pre-line">{text}</p>
    </div>
  );
}

function ListCard({ title, items, accent }: { title: string; items?: string[]; accent: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm flex">
      <div className={`w-1 shrink-0 ${accent} opacity-60`} />
      <div className="px-4 py-4 flex-1 min-w-0">
        <h3 className="font-semibold text-stone-500 dark:text-zinc-500 mb-2 text-xs uppercase tracking-widest">{title}</h3>
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li key={i} className="text-stone-800 dark:text-zinc-200 leading-relaxed text-[0.94rem] flex gap-2">
              <span className="text-stone-300 dark:text-zinc-600 shrink-0">•</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
