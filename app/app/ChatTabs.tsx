'use client';

import Link from 'next/link';
import { useLang } from '@/lib/i18n';

// Sub-nav for the שיחה area: live conversation, searchable history, and the
// patients mini-CRM.
export default function ChatTabs({ active }: { active: 'chat' | 'history' | 'patients' }) {
  const { language } = useLang();
  const he = language === 'he';
  const item = (key: 'chat' | 'history' | 'patients', href: string, label: string) => (
    <Link
      href={href}
      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active === key
          ? 'bg-indigo-950 dark:bg-indigo-600 text-white'
          : 'text-stone-500 dark:text-zinc-400 hover:bg-stone-200/60 dark:hover:bg-zinc-800'
      }`}
    >
      {label}
    </Link>
  );
  return (
    <div className="flex gap-1 mb-3 p-1 rounded-xl bg-stone-100 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 w-fit mx-auto">
      {item('chat', '/app/conversation', he ? 'שיחה' : 'Conversation')}
      {item('history', '/app/history', he ? 'היסטוריה' : 'History')}
      {item('patients', '/app/patients', he ? 'מטופלים' : 'Patients')}
    </div>
  );
}
