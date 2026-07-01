'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

type PageState = 'loading' | 'ready' | 'invalid' | 'success';

export default function ResetPasswordConfirmPage() {
  const t = useT();
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let invalidTimer: ReturnType<typeof setTimeout>;

    // Listen for Supabase's PASSWORD_RECOVERY event (fired when hash is parsed)
    const { data: { subscription } } = supabase().auth.onAuthStateChange((event: string) => {
      if (event === 'PASSWORD_RECOVERY') {
        clearTimeout(invalidTimer);
        setPageState('ready');
      }
    });

    // Also check if a session already exists (e.g. on re-visit)
    void supabase().auth.getSession().then((res: Awaited<ReturnType<typeof supabase['prototype']['auth']['getSession']>>) => {
      if (res.data.session) {
        clearTimeout(invalidTimer);
        setPageState('ready');
      } else {
        // Give Supabase 2s to process the URL hash before showing invalid
        invalidTimer = setTimeout(() => setPageState('invalid'), 2000);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(invalidTimer);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t.auth_password_too_short);
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase().auth.updateUser({ password });
      if (updateError) throw updateError;
      setPageState('success');
      setTimeout(() => router.push('/app/conversation'), 2200);
    } catch {
      setError(t.auth_error_generic);
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Loading ── */
  if (pageState === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-zinc-950">
        <div className="flex gap-1.5">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="w-2 h-2 rounded-full bg-stone-400 dark:bg-zinc-600 animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </main>
    );
  }

  /* ── Invalid link ── */
  if (pageState === 'invalid') {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-12 bg-stone-50 dark:bg-zinc-950">
        <div className="w-full max-w-md text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center mx-auto">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-red-600 dark:text-red-400">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-zinc-100">
            {t.auth_reset_confirm_invalid_link.split('.')[0]}
          </h1>
          <p className="text-stone-500 dark:text-zinc-400 text-sm leading-relaxed">
            {t.auth_reset_confirm_invalid_link}
          </p>
          <Link
            href="/auth/reset-password"
            className="inline-block px-5 py-2.5 rounded-xl bg-indigo-950 dark:bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors"
          >
            {t.auth_forgot_password}
          </Link>
        </div>
      </main>
    );
  }

  /* ── Success ── */
  if (pageState === 'success') {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-12 bg-stone-50 dark:bg-zinc-950">
        <div className="w-full max-w-md text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-950/40 flex items-center justify-center mx-auto">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-zinc-100">
            {t.auth_reset_confirm_success}
          </h1>
          <p className="text-stone-500 dark:text-zinc-400 text-sm">Redirecting you now…</p>
        </div>
      </main>
    );
  }

  /* ── Ready - show form ── */
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12 bg-stone-50 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-950 dark:bg-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-base leading-none">K</span>
          </div>
          <span className="font-semibold text-stone-900 dark:text-zinc-100 text-lg">KopelAi</span>
        </div>

        <h1 className="text-3xl font-bold text-stone-900 dark:text-zinc-100 mb-1">
          {t.auth_reset_confirm_title}
        </h1>
        <p className="text-stone-500 dark:text-zinc-400 mb-8 leading-relaxed">
          {t.auth_reset_confirm_subtitle}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-zinc-300 mb-1.5">
              {t.auth_reset_confirm_new_password}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.auth_password_placeholder}
                autoComplete="new-password"
                disabled={submitting}
                className="w-full px-4 py-3 pe-11 rounded-xl border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-900/25 dark:focus:ring-indigo-500/40 focus:border-indigo-900 dark:focus:border-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t.auth_hide_password : t.auth_show_password}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
            {/* Password strength bar */}
            {password.length > 0 && (
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      password.length >= level * 3
                        ? password.length >= 12
                          ? 'bg-green-500'
                          : password.length >= 8
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                        : 'bg-stone-200 dark:bg-zinc-700'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-indigo-950 dark:bg-indigo-600 text-white font-medium hover:bg-indigo-900 dark:hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {submitting ? t.auth_reset_confirm_button_loading : t.auth_reset_confirm_button}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/auth/signin"
            className="text-sm text-stone-500 dark:text-zinc-500 hover:text-orange-700 dark:hover:text-orange-400 transition-colors"
          >
            {t.auth_reset_confirm_back_to_signin}
          </Link>
        </div>
      </div>
    </main>
  );
}
