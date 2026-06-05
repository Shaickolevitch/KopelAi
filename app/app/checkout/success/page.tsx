'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { invalidateSubscriptionCache } from '@/lib/subscription';

const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 30000;

export default function CheckoutSuccessPage() {
  const t = useT();
  const router = useRouter();
  const [phase, setPhase] = useState<'verifying' | 'redirecting' | 'timeout'>('verifying');
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let stopped = false;

    async function poll() {
      const user = await getCurrentUser();
      if (!user || stopped) return;

      const { data } = await supabase()
        .from('user_profile')
        .select('subscription_tier')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.subscription_tier === 'pro') {
        invalidateSubscriptionCache();
        setPhase('redirecting');
        if (!stopped) setTimeout(() => router.replace('/app/insights'), 1200);
        return;
      }

      if (Date.now() - startedAt.current >= TIMEOUT_MS) {
        setPhase('timeout');
        return;
      }

      if (!stopped) setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll();
    return () => { stopped = true; };
  }, [router]);

  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mx-auto">
          {phase === 'timeout' ? (
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-amber-500">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
          ) : (
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500 dark:text-indigo-400">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-zinc-100 mb-2">
            {t.checkout_success_title}
          </h1>
          <p className="text-stone-500 dark:text-zinc-400 text-sm leading-relaxed">
            {phase === 'verifying' && t.checkout_success_body}
            {phase === 'redirecting' && t.checkout_success_redirect}
            {phase === 'timeout' && t.checkout_success_timeout}
          </p>
        </div>

        {phase !== 'timeout' && (
          <div className="flex justify-center gap-1.5">
            {[0, 150, 300].map((d) => (
              <span key={d} className="w-2 h-2 rounded-full bg-indigo-400 dark:bg-indigo-500 animate-bounce"
                style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        )}

        {phase === 'timeout' && (
          <button
            onClick={() => router.replace('/app/plan')}
            className="px-5 py-2.5 rounded-xl bg-indigo-950 dark:bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-900 transition-colors"
          >
            {t.checkout_success_goto_settings}
          </button>
        )}
      </div>
    </div>
  );
}
