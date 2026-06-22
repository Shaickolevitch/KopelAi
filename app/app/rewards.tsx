'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLang } from '@/lib/i18n';
import { getWaterRewards, collectWaterReward, type WaterReward } from '@/lib/api';

type RewardsCtx = {
  rewards: WaterReward[];
  focusedId: string | null;
  refresh: () => void;
  collect: (id: string) => Promise<void>;
  goToNext: () => void;
};

const Ctx = createContext<RewardsCtx>({
  rewards: [], focusedId: null, refresh: () => {}, collect: async () => {}, goToNext: () => {},
});

export function useRewards() { return useContext(Ctx); }

export function RewardsProvider({ children }: { children: ReactNode }) {
  const [rewards, setRewards] = useState<WaterReward[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const refresh = useCallback(() => {
    getWaterRewards().then(setRewards).catch(() => {});
  }, []);

  // Refresh on mount, on navigation, and on a gentle poll (so a drop earned
  // while staying on the same page — e.g. the daily streak — still shows up).
  useEffect(() => { refresh(); }, [refresh, pathname]);
  useEffect(() => {
    const t = setInterval(refresh, 30_000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [refresh]);

  const collect = useCallback(async (id: string) => {
    setRewards((prev) => prev.filter((r) => r.id !== id)); // optimistic
    setFocusedId((f) => (f === id ? null : f));
    try { await collectWaterReward(id); } catch { refresh(); }
  }, [refresh]);

  const goToNext = useCallback(() => {
    if (rewards.length === 0) return;
    const next = rewards[0];
    setFocusedId(next.id);
    if (pathname !== next.route) router.push(next.route);
  }, [rewards, pathname, router]);

  return <Ctx.Provider value={{ rewards, focusedId, refresh, collect, goToNext }}>{children}</Ctx.Provider>;
}

// Header chip: a pulsing water drop with the number of uncollected rewards.
// Tapping it walks you to the next one's source and makes it pulse.
export function DropTrail() {
  const { rewards, goToNext } = useRewards();
  if (rewards.length === 0) return null;
  const total = rewards.reduce((s, r) => s + r.amount, 0);
  return (
    <button
      onClick={goToNext}
      aria-label="Collect water drops"
      title={`${total} 💧`}
      className="relative flex items-center px-2 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
    >
      <span className="text-base leading-none animate-bounce">💧</span>
      <span className="absolute -top-0.5 -end-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-sky-500 text-white text-[10px] font-semibold flex items-center justify-center">
        {rewards.length}
      </span>
    </button>
  );
}

// A collectible spot on a page. Renders any pending reward whose source is in
// `sources` (optionally filtered to a specific ref, e.g. one conversation).
// Tapping a drop collects it into the reserve.
export function DropSpot({ sources, refId, className = '' }: { sources: string[]; refId?: string; className?: string }) {
  const { rewards, focusedId, collect } = useRewards();
  const { language } = useLang();
  const he = language === 'he';
  const ref = useRef<HTMLDivElement>(null);

  const mine = rewards.filter((r) => sources.includes(r.source) && (!refId || r.ref === refId));

  useEffect(() => {
    if (focusedId && mine.some((r) => r.id === focusedId)) {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedId, mine.length]);

  if (mine.length === 0) return null;

  return (
    <div ref={ref} className={`flex flex-wrap gap-2 justify-center my-3 ${className}`}>
      {mine.map((r) => {
        const focused = focusedId === r.id;
        return (
          <button
            key={r.id}
            onClick={() => collect(r.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
              focused
                ? 'bg-sky-100 dark:bg-sky-950/50 border-sky-400 text-sky-700 dark:text-sky-300 ring-2 ring-sky-400/50 animate-bounce'
                : 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900 text-sky-700 dark:text-sky-300 animate-pulse'
            }`}
          >
            <span>💧 +{r.amount}</span>
            <span className="opacity-80">· {he ? r.label_he : r.label_en}</span>
            <span className="opacity-60 text-xs">· {he ? 'אסוף' : 'collect'}</span>
          </button>
        );
      })}
    </div>
  );
}
