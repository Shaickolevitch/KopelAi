'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/i18n';
import { sendPasswordResetEmail, authErrorToMessageKey } from '@/lib/auth';

export default function ResetPasswordPage() {
  const t = useT();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError(t.auth_error_invalid_email);
      return;
    }

    setSubmitting(true);
    try {
      await sendPasswordResetEmail(trimmedEmail);
      setSent(true);
    } catch (err: unknown) {
      const key = authErrorToMessageKey(err);
      const message = (t as Record<string, unknown>)[key];
      setError(typeof message === 'string' ? message : t.auth_error_generic);
    } finally {
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

        <h1 className="text-3xl font-bold text-stone-900 dark:text-zinc-100 mb-1">
          {t.auth_forgot_password}
        </h1>
        {!sent && (
          <p className="text-stone-500 dark:text-zinc-400 mb-8 text-sm leading-relaxed">
            {t.auth_reset_intro}
          </p>
        )}

        {sent ? (
          <div className="space-y-5 mt-6">
            <div className="flex items-start gap-3 px-4 py-4 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400 mt-0.5 shrink-0">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <p className="text-green-700 dark:text-green-300 text-sm leading-relaxed">
                {t.auth_reset_email_sent}
              </p>
            </div>
            <div className="text-center">
              <Link
                href="/auth/signin"
                className="text-sm text-stone-500 dark:text-zinc-500 hover:text-orange-700 dark:hover:text-orange-400 transition-colors"
              >
                {t.auth_switch_to_signin}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
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
                {submitting ? '…' : t.auth_send_reset_button}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/auth/signin"
                className="text-sm text-stone-500 dark:text-zinc-500 hover:text-orange-700 dark:hover:text-orange-400 transition-colors"
              >
                {t.auth_switch_to_signin}
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
