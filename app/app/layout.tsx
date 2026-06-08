'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useT, useLang } from '@/lib/i18n';
import { AuthUser, getCurrentUser, signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function AppLayout({ children }: { children: ReactNode }) {
  const t = useT();
  const { language, setLanguage } = useLang();
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) router.replace('/auth/signin');
      else { setUser(u); setChecking(false); }
    });
  }, [router]);

  useEffect(() => {
    const { data: { subscription } } = supabase().auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_OUT') router.replace('/');
    });
    return () => subscription.unsubscribe();
  }, [router]);

  if (checking || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-zinc-950">
        <div className="flex gap-1.5">
          {[0, 150, 300].map((d) => (
            <span key={d} className="w-2 h-2 rounded-full bg-stone-400 dark:bg-zinc-600 animate-bounce"
              style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  // TODO: replace hard-coded admin email with a proper role flag on the profile.
  const ADMIN_EMAIL = 'shaigian1@gmail.com';
  const isAdmin = user.email === ADMIN_EMAIL;

  const navItems = [
    { href: '/app/conversation', label: t.tab_conversation },
    { href: '/app/insights', label: t.tab_analysis },
    { href: '/app/store', label: t.tab_lectures },
    { href: '/app/about', label: t.tab_about_us },
    { href: '/app/plan', label: t.tab_plan },
    ...(isAdmin ? [{ href: '/app/admin', label: t.tab_admin }] : []),
  ];

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 flex flex-col">
      <header className="border-b border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          {/* Wordmark */}
          <Link href="/app/conversation" className="flex items-center gap-2 group shrink-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-950 dark:bg-indigo-600 flex items-center justify-center group-hover:bg-indigo-900 dark:group-hover:bg-indigo-500 transition-colors">
              <span className="text-white font-bold text-sm leading-none">K</span>
            </div>
            <span className="hidden sm:inline font-semibold text-stone-900 dark:text-zinc-100 text-[15px]">KopelAi</span>
          </Link>

          {/* Nav tabs + sign out */}
          <div className="flex items-center gap-1 min-w-0 overflow-x-auto [&_a]:shrink-0 [&_button]:shrink-0">
            <nav className="flex gap-0.5">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      active
                        ? 'bg-stone-100 dark:bg-zinc-800 text-stone-900 dark:text-zinc-100 font-medium'
                        : 'text-stone-500 dark:text-zinc-500 hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-stone-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <button
              onClick={() => setLanguage(language === 'he' ? 'en' : 'he')}
              className="px-3 py-2 text-sm rounded-lg text-stone-500 dark:text-zinc-500 hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-stone-800 dark:hover:text-zinc-200 transition-colors"
              aria-label={language === 'he' ? 'Switch to English' : 'עבור לעברית'}
            >
              {language === 'he' ? 'EN' : 'עב'}
            </button>
            <button
              onClick={async () => {
                const msg = language === 'he' ? 'להתנתק מהחשבון?' : 'Log out of your account?';
                if (!window.confirm(msg)) return;
                try { await signOut(); } catch {}
                router.replace('/');
              }}
              className="px-3 py-2 text-sm rounded-lg text-stone-500 dark:text-zinc-500 hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-stone-800 dark:hover:text-zinc-200 transition-colors"
            >
              {t.settings_sign_out}
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>

      <footer className="border-t border-stone-200 dark:border-zinc-800 py-4">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-stone-400 dark:text-zinc-600">
          {(() => {
            const he = language === 'he';
            const s = he ? '-he' : '';
            return (
              <>
                <a href={`/about${s}`} className="hover:text-stone-600 dark:hover:text-zinc-400 transition-colors">{he ? 'אודות' : 'About'}</a>
                <a href={`/contact${s}`} className="hover:text-stone-600 dark:hover:text-zinc-400 transition-colors">{he ? 'יצירת קשר' : 'Contact'}</a>
                <a href={`/privacy${s}`} className="hover:text-stone-600 dark:hover:text-zinc-400 transition-colors">{he ? 'פרטיות' : 'Privacy'}</a>
                <a href={`/terms${s}`} className="hover:text-stone-600 dark:hover:text-zinc-400 transition-colors">{he ? 'תנאי שימוש' : 'Terms'}</a>
              </>
            );
          })()}
        </div>
      </footer>
    </div>
  );
}
