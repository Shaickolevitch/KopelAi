'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLang } from '@/lib/i18n';
import { getTree, fillTree, TreeState } from '@/lib/api';

const STAGE_NAMES: Record<string, { he: string; en: string }> = {
  seed: { he: 'זרע', en: 'Seed' },
  sprout: { he: 'נבט', en: 'Sprout' },
  seedling: { he: 'שתיל', en: 'Seedling' },
  sapling: { he: 'עץ צעיר', en: 'Sapling' },
  young: { he: 'עץ', en: 'Young tree' },
  blossom: { he: 'פריחה', en: 'Blossom' },
  fruiting: { he: 'עץ תפוז', en: 'Orange tree' },
};
const STAGE_ORDER = ['seed', 'sprout', 'seedling', 'sapling', 'young', 'blossom', 'fruiting'];

export default function TreePage() {
  const { language } = useLang();
  const he = language === 'he';
  const [tree, setTree] = useState<TreeState | null>(null);
  const [loading, setLoading] = useState(true);
  const [filling, setFilling] = useState(false);
  const [pouredMsg, setPouredMsg] = useState<string | null>(null);

  useEffect(() => {
    getTree().then(setTree).catch(() => setTree(null)).finally(() => setLoading(false));
  }, []);

  async function handleFill() {
    if (filling) return;
    setFilling(true);
    try {
      const next = await fillTree();
      setTree(next);
      if (next.poured > 0) {
        setPouredMsg(he ? `הוספת ${next.poured} טיפות לדלי 💧` : `Poured ${next.poured} drops 💧`);
        setTimeout(() => setPouredMsg(null), 2500);
      }
    } catch { /* ignore */ } finally {
      setFilling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <div className="flex gap-1.5">
          {[0, 150, 300].map((d) => (
            <span key={d} className="w-2 h-2 rounded-full bg-stone-300 dark:bg-zinc-700 animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  // Not planted → Pro/trial gate.
  if (!tree || !tree.planted) {
    return (
      <div className="flex-1 max-w-md mx-auto w-full px-6 py-14 text-center">
        <div className="mb-5"><TreeArt stageIndex={0} wilting={false} /></div>
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-zinc-100 mb-2">{he ? 'העץ שלך מחכה להישתל' : 'Your tree is waiting to be planted'}</h1>
        <p className="text-sm text-stone-500 dark:text-zinc-400 leading-relaxed mb-6">
          {he
            ? 'כשתתחיל תקופת ניסיון פרו, נשתול זרע — והקשר שלך עם קופל יגדל לעץ תפוז, טיפה־טיפה.'
            : 'When you start a Pro trial we plant a seed — and your bond with Kopel grows into an orange tree, drop by drop.'}
        </p>
        <Link href="/app/plan" className="inline-block px-6 py-3 rounded-xl bg-indigo-950 dark:bg-indigo-600 text-white font-medium hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors">
          {he ? 'התחל תקופת ניסיון' : 'Start a trial'}
        </Link>
      </div>
    );
  }

  const stageName = STAGE_NAMES[tree.stageKey]?.[he ? 'he' : 'en'] ?? tree.stageKey;
  const hoursLeft = tree.bucket; // 1 drop ≈ 1 hour
  const bucketPct = Math.round((tree.bucket / tree.bucketCapacity) * 100);
  const toNext = tree.nextStageAt != null ? Math.max(0, tree.nextStageAt - tree.growthPoints) : 0;
  const stagePct = tree.nextStageAt != null
    ? Math.min(100, Math.round(((tree.growthPoints - tree.currentStageAt) / (tree.nextStageAt - tree.currentStageAt)) * 100))
    : 100;

  return (
    <div className="flex-1 max-w-xl mx-auto w-full px-4 sm:px-6 py-6">
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-zinc-100 mb-1 text-center">{he ? 'העץ שלי' : 'My tree'}</h1>
      <p className="text-sm text-stone-400 dark:text-zinc-500 text-center mb-4">{he ? 'הקשר שלך עם קופל' : 'Your bond with Kopel'}</p>

      {/* The tree */}
      <div className="rounded-3xl border border-stone-200 dark:border-zinc-800 bg-gradient-to-b from-sky-50/60 to-white dark:from-zinc-900 dark:to-zinc-900 py-4">
        <TreeArt stageIndex={tree.stageIndex} wilting={tree.wilting} />
        <p className="text-center mt-1 text-lg font-semibold text-stone-800 dark:text-zinc-100">{stageName}</p>
      </div>

      {/* Status banners */}
      {tree.frozen ? (
        <Banner tone="muted">{he ? '❄️ העץ קפוא — חידוש מנוי פרו ימשיך להשקות אותו. ההתקדמות נשמרת.' : '❄️ Your tree is paused — renewing Pro resumes watering. Your progress is saved.'}</Banner>
      ) : tree.wilting ? (
        <Banner tone="warn">{he ? '🥀 העץ צמא ומתחיל לנבול — מלא את הדלי כדי להשקות אותו.' : '🥀 Your tree is wilting — fill the bucket to water it.'}</Banner>
      ) : tree.bucket === 0 ? (
        <Banner tone="warn">{he ? '💧 הדלי ריק — מלא אותו כדי שהעץ ימשיך לגדול.' : '💧 The bucket is empty — fill it so the tree keeps growing.'}</Banner>
      ) : tree.bucket <= 4 ? (
        <Banner tone="warn">{he ? '💧 הדלי כמעט ריק — שווה למלא.' : '💧 The bucket is almost empty — worth a refill.'}</Banner>
      ) : null}

      {/* The bucket — fill it from your earned drops */}
      <div className="mt-4 rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="font-medium text-stone-700 dark:text-zinc-300">{he ? 'הדלי' : 'The bucket'}</span>
          <span className="text-stone-500 dark:text-zinc-400 tabular-nums">{tree.bucket}/{tree.bucketCapacity} 💧 · {hoursLeft} {he ? 'ש׳' : 'h'}</span>
        </div>
        <div className="h-3 rounded-full bg-stone-100 dark:bg-zinc-800 overflow-hidden mb-3">
          <div className="h-full bg-sky-400 transition-all" style={{ width: `${bucketPct}%` }} />
        </div>
        <button
          onClick={handleFill}
          disabled={!tree.canFill || filling}
          className="w-full py-2.5 rounded-xl bg-sky-600 text-white text-sm font-medium hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {filling
            ? (he ? 'ממלא…' : 'Filling…')
            : tree.canFill
              ? (he ? `מלא את הדלי (${tree.reserve} 💧 בצד)` : `Fill the bucket (${tree.reserve} 💧 banked)`)
              : tree.bucket >= tree.bucketCapacity
                ? (he ? 'הדלי מלא 🪣' : 'Bucket is full 🪣')
                : (he ? 'אין טיפות לצקת — שוחח עם קופל כדי לצבור' : 'No drops to pour — talk to Kopel to earn some')}
        </button>
        {pouredMsg && <p className="text-center text-xs text-sky-600 dark:text-sky-400 mt-2">{pouredMsg}</p>}
        <p className="text-xs text-stone-400 dark:text-zinc-500 mt-2 leading-relaxed">
          {he ? 'הדלי מתרוקן בקצב טיפה לשעה. מלא אותו לפחות פעם ביום מהטיפות שצברת.' : 'The bucket drains 1 drop/hour. Fill it at least once a day from the drops you’ve earned.'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <Stat value={`💧 ${tree.reserve}`} label={he ? 'טיפות שצברת' : 'banked drops'} />
        <Stat value={`${hoursLeft} ${he ? 'שעות' : 'h'}`} label={he ? 'מים בדלי' : 'in bucket'} />
        <Stat value={`🔥 ${tree.streakDays}`} label={he ? 'ימים ברצף' : 'day streak'} />
      </div>

      {/* Progress to next checkpoint */}
      {tree.nextStageAt != null ? (
        <div className="mt-5">
          <div className="flex justify-between text-xs text-stone-500 dark:text-zinc-400 mb-1.5">
            <span>{he ? 'לשלב הבא' : 'To next stage'}</span>
            <span>{he ? `עוד ${toNext} ימי גדילה` : `${toNext} growth days to go`}</span>
          </div>
          <div className="h-2.5 rounded-full bg-stone-100 dark:bg-zinc-800 overflow-hidden">
            <div className="h-full rounded-full bg-sage transition-all" style={{ width: `${stagePct}%` }} />
          </div>
        </div>
      ) : (
        <p className="mt-5 text-center text-sm text-sage font-medium">{he ? '🍊 העץ שלך הגיע לבשלות מלאה — עץ תפוז נושא פרי!' : '🍊 Your tree has reached full maturity — a fruiting orange tree!'}</p>
      )}

      {/* Checkpoints */}
      <div className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-500 mb-2.5">{he ? 'נקודות ציון' : 'Checkpoints'}</h2>
        <div className="flex items-center justify-between gap-1">
          {STAGE_ORDER.map((key, i) => {
            const reached = i <= tree.stageIndex;
            const current = i === tree.stageIndex;
            return (
              <div key={key} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <div className={`w-3.5 h-3.5 rounded-full ${reached ? 'bg-sage' : 'bg-stone-200 dark:bg-zinc-800'} ${current ? 'ring-2 ring-sage/40' : ''}`} />
                <span className={`text-[10px] text-center leading-tight truncate w-full ${current ? 'text-stone-800 dark:text-zinc-200 font-medium' : 'text-stone-400 dark:text-zinc-600'}`}>
                  {STAGE_NAMES[key]?.[he ? 'he' : 'en']}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* How to water */}
      <div className="mt-7 rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-zinc-300 mb-2">{he ? 'איך משקים את העץ?' : 'How to water it'}</h2>
        <ul className="space-y-1.5 text-sm text-stone-600 dark:text-zinc-400">
          {(he
            ? ['לשוחח עם קופל ולסיים מפגש', 'להגיע יום אחרי יום (רצף)', 'כל הוקרה שקופל נותן לך', 'להפיק ניתוח שיחה', 'להשאיר המלצה, לחבר וואטסאפ, להזמין חבר']
            : ['Talk to Kopel and end a session', 'Show up day after day (streak)', 'Every piece of praise Kopel gives you', 'Generate a conversation analysis', 'Leave a review, connect WhatsApp, invite a friend']
          ).map((t, i) => (
            <li key={i} className="flex gap-2"><span className="text-sage shrink-0">💧</span><span>{t}</span></li>
          ))}
        </ul>
      </div>
      <div className="h-12" />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-3 text-center">
      <div className="text-lg font-bold text-stone-900 dark:text-zinc-100">{value}</div>
      <div className="text-[11px] text-stone-500 dark:text-zinc-500 mt-0.5">{label}</div>
    </div>
  );
}

function Banner({ tone, children }: { tone: 'warn' | 'muted'; children: React.ReactNode }) {
  const cls = tone === 'warn'
    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300'
    : 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900 text-sky-800 dark:text-sky-300';
  return <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm text-center ${cls}`}>{children}</div>;
}

// Signature orange-tree illustrations (brand design-system assets in /public/tree).
// Stages 1–7; wilted variants exist for stages 4–7. Earlier stages fall back to a
// gentle CSS wilt filter since they have no dedicated thirsty art.
const TREE_FILES = ['tree-1-seed', 'tree-2-sprout', 'tree-3-seedling', 'tree-4-sapling', 'tree-5-young', 'tree-6-blossom', 'tree-7-fruiting'];
const HAS_WILTED = new Set([3, 4, 5, 6]); // 0-based stage indices with a -wilted asset

export function TreeArt({ stageIndex, wilting }: { stageIndex: number; wilting: boolean }) {
  const i = Math.max(0, Math.min(TREE_FILES.length - 1, stageIndex));
  const useWiltedAsset = wilting && HAS_WILTED.has(i);
  const src = `/tree/${TREE_FILES[i]}${useWiltedAsset ? '-wilted' : ''}.png`;
  // If the tree is thirsty but the stage has no wilted artwork, soften it in CSS.
  const cssWilt = wilting && !useWiltedAsset;
  return (
    <img
      src={src}
      alt=""
      width={220}
      height={220}
      className="mx-auto block w-[220px] h-[220px] object-contain select-none"
      style={{ filter: cssWilt ? 'saturate(0.5) sepia(0.2)' : 'none', transition: 'filter 0.4s, opacity 0.4s' }}
      draggable={false}
    />
  );
}
