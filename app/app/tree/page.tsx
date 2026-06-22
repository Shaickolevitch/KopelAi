'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLang } from '@/lib/i18n';
import { getTree, TreeState } from '@/lib/api';

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

  useEffect(() => {
    getTree().then(setTree).catch(() => setTree(null)).finally(() => setLoading(false));
  }, []);

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
  const daysLeft = tree.waterDrops;
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
        <Banner tone="warn">{he ? '🥀 העץ צמא ומתחיל לנבול — שיחה עם קופל תשקה אותו מיד.' : '🥀 Your tree is thirsty and starting to wilt — a conversation with Kopel will water it.'}</Banner>
      ) : daysLeft <= 2 ? (
        <Banner tone="warn">{he ? '💧 נשארו מעט טיפות מים — חזור לשוחח כדי להמשיך להשקות.' : '💧 Low on water — come back and talk to keep it watered.'}</Banner>
      ) : null}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <Stat value={`💧 ${tree.waterDrops}`} label={he ? 'טיפות מים' : 'water drops'} />
        <Stat value={`${daysLeft} ${he ? 'ימים' : 'days'}`} label={he ? 'מים שנותרו' : 'water left'} />
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

// Parametric orange tree — grows with stageIndex (0 seed … 6 fruiting); wilting
// desaturates and droops it. Self-contained SVG, brand colors.
export function TreeArt({ stageIndex, wilting }: { stageIndex: number; wilting: boolean }) {
  const trunkH = [0, 16, 30, 52, 82, 102, 116][stageIndex] ?? 0;
  const canopyR = [0, 12, 18, 28, 42, 52, 60][stageIndex] ?? 0;
  const cx = 100;
  const groundY = 212;
  const topY = groundY - trunkH;
  const green = '#4e7c6b';
  const greenLight = '#6fa088';
  const trunk = '#8a5a3b';

  const oranges = stageIndex >= 6 ? [[-26, -8], [22, -18], [4, 16], [-12, -28], [30, 6]] : [];
  const blossoms = stageIndex >= 5 ? [[-18, 10], [16, -4], [0, -22], [-30, -10], [26, 14]] : [];

  return (
    <svg viewBox="0 0 200 240" width="100%" height="220" role="img"
      style={{ filter: wilting ? 'saturate(0.45) sepia(0.25)' : 'none', transition: 'filter 0.4s' }}>
      {/* ground */}
      <ellipse cx={cx} cy="216" rx="74" ry="11" fill="#e7d9c4" className="dark:opacity-20" />
      <ellipse cx={cx} cy="214" rx="50" ry="7" fill="#d8c4a6" className="dark:opacity-20" />

      {stageIndex === 0 ? (
        // Seed half-buried in soil
        <g transform={`rotate(${wilting ? 4 : 0} ${cx} 206)`}>
          <ellipse cx={cx} cy="205" rx="13" ry="9" fill="#9a6b42" />
          <ellipse cx={cx - 3} cy="203" rx="4" ry="3" fill="#c79a6f" />
        </g>
      ) : (
        <g transform={`rotate(${wilting ? 5 : 0} ${cx} ${groundY})`} style={{ transition: 'transform 0.4s' }}>
          {/* trunk */}
          <rect x={cx - Math.max(3, trunkH / 20)} y={topY} width={Math.max(6, trunkH / 10)} height={trunkH} rx="4" fill={trunk} />
          {/* canopy: a cluster of puffs */}
          <circle cx={cx} cy={topY} r={canopyR} fill={green} />
          <circle cx={cx - canopyR * 0.6} cy={topY + canopyR * 0.25} r={canopyR * 0.62} fill={greenLight} />
          <circle cx={cx + canopyR * 0.6} cy={topY + canopyR * 0.2} r={canopyR * 0.6} fill={greenLight} />
          <circle cx={cx} cy={topY - canopyR * 0.45} r={canopyR * 0.6} fill={green} />
          {/* blossoms */}
          {blossoms.map(([dx, dy], i) => (
            <circle key={`b${i}`} cx={cx + dx} cy={topY + dy} r="3.2" fill="#f6d3df" />
          ))}
          {/* oranges */}
          {oranges.map(([dx, dy], i) => (
            <circle key={`o${i}`} cx={cx + dx} cy={topY + dy} r="5.5" fill="#e8821e" stroke="#c96a12" strokeWidth="0.5" />
          ))}
        </g>
      )}
    </svg>
  );
}
