'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useT, useLang } from '@/lib/i18n';
import { signInWithEmail, signInWithGoogle, authErrorToMessageKey } from '@/lib/auth';

function GoogleButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 rounded-xl border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 font-medium hover:bg-stone-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2.5"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
      </svg>
      {label}
    </button>
  );
}

export default function SigninPage() {
  const t = useT();
  const { language } = useLang();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Where to go after login (set by the app layout when it bounces a deep link
  // like /app/review here). Only internal paths are honored.
  function nextDest(): string {
    if (typeof window === 'undefined') return '/app/conversation';
    const n = new URLSearchParams(window.location.search).get('next');
    return n && n.startsWith('/') ? n : '/app/conversation';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError(t.auth_error_invalid_email);
      return;
    }
    if (!password) {
      setError(t.auth_error_wrong_credentials);
      return;
    }

    setSubmitting(true);
    try {
      await signInWithEmail(trimmedEmail, password);
      router.push(nextDest());
    } catch (err: unknown) {
      const key = authErrorToMessageKey(err);
      const message = (t as Record<string, unknown>)[key];
      setError(typeof message === 'string' ? message : t.auth_error_generic);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle(nextDest());
    } catch {
      setError(t.auth_error_generic);
      setSubmitting(false);
    }
  }

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

        <h1 className="text-3xl font-bold text-stone-900 dark:text-zinc-100 mb-8">
          {t.auth_signin_title}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-zinc-300 mb-1.5">
              {t.auth_email_label}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.auth_email_placeholder}
              autoComplete="email"
              disabled={submitting}
              className="w-full px-4 py-3 rounded-xl border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-900/25 dark:focus:ring-indigo-500/40 focus:border-indigo-900 dark:focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-stone-700 dark:text-zinc-300">
                {t.auth_password_label}
              </label>
              <Link
                href="/auth/reset-password"
                className="text-xs text-stone-500 dark:text-zinc-500 hover:text-orange-700 dark:hover:text-orange-400 transition-colors"
              >
                {t.auth_forgot_password}
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.auth_password_placeholder}
                autoComplete="current-password"
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
            {submitting ? '…' : t.auth_signin_button}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-stone-200 dark:bg-zinc-800" />
          <span className="text-xs text-stone-400 dark:text-zinc-600">
            {language === 'he' ? 'או' : 'or'}
          </span>
          <div className="flex-1 h-px bg-stone-200 dark:bg-zinc-800" />
        </div>

        <GoogleButton
          label={language === 'he' ? 'המשך עם Google' : 'Continue with Google'}
          onClick={handleGoogle}
          disabled={submitting}
        />

        <div className="mt-6 text-center">
          <Link
            href={typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('next')
              ? `/auth/signup?next=${encodeURIComponent(new URLSearchParams(window.location.search).get('next') as string)}`
              : '/auth/signup'}
            className="text-sm text-orange-700 dark:text-orange-400 hover:underline"
          >
            {t.auth_switch_to_signup}
          </Link>
        </div>
      </div>
    </main>
  );
}
