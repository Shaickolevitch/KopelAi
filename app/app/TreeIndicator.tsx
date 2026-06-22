'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getTree, TreeState } from '@/lib/api';

// Small always-visible header chip: a sprout + water-drop count, linking to the
// tree page. Hidden until a tree is planted (Pro/trial). A thirsty tree shows a
// gentle amber dot.
export default function TreeIndicator() {
  const [tree, setTree] = useState<TreeState | null>(null);

  useEffect(() => {
    getTree().then(setTree).catch(() => setTree(null));
  }, []);

  if (!tree || !tree.planted) return null;

  // Nudge only when the tree genuinely needs water — wilting or the bucket
  // running low. (Not merely "you have drops to top off", which is almost always
  // true and made the dot show constantly.)
  const nudge = !tree.frozen && (tree.wilting || tree.bucket <= 4);
  return (
    <Link
      href="/app/tree"
      aria-label="My tree"
      className="relative flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm text-stone-500 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
    >
      <span className="text-base leading-none">{tree.stageIndex >= 4 ? '🌳' : tree.stageIndex >= 1 ? '🌱' : '🌰'}</span>
      <span className="text-xs tabular-nums text-sky-600 dark:text-sky-400">💧{tree.bucket}</span>
      {nudge && <span className="absolute -top-0.5 -end-0.5 w-2 h-2 rounded-full bg-amber-500" />}
    </Link>
  );
}
