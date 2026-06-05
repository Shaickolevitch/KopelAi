'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLang } from '@/lib/i18n';
import { adminListUsers, adminSetTier, adminDeleteUser, type AdminUser } from '@/lib/api';

export default function AdminUsers() {
  const { language } = useLang();
  const isHebrew = language === 'he';

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState<'all' | 'free' | 'pro'>('all');
  const [page, setPage] = useState(0);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminListUsers({ search, tier, page });
      setUsers(res.users);
      setTotal(res.total);
      setPageSize(res.pageSize);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, tier, page]);

  useEffect(() => { load(); }, [load]);

  async function changeTier(u: AdminUser, newTier: 'free' | 'pro') {
    setBusyId(u.id);
    setError('');
    try {
      await adminSetTier(u.id, newTier);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, tier: newTier } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  async function removeUser(u: AdminUser) {
    const msg = isHebrew
      ? `למחוק לצמיתות את ${u.email}? כל הנתונים שלו יימחקו. אין ביטול.`
      : `Permanently delete ${u.email}? All their data will be removed. This cannot be undone.`;
    if (!window.confirm(msg)) return;
    setBusyId(u.id);
    setError('');
    try {
      await adminDeleteUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  }

  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, page * pageSize + users.length);
  const hasNext = (page + 1) * pageSize < total;

  return (
    <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
      <div className="font-semibold text-stone-900 dark:text-zinc-100 mb-1">
        {isHebrew ? 'ניהול משתמשים' : 'Users'}
      </div>
      <p className="text-sm text-stone-500 dark:text-zinc-500 mb-4">
        {isHebrew ? 'חיפוש, שינוי תוכנית ומחיקה.' : 'Search, change plan, and delete.'}
      </p>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={isHebrew ? 'חיפוש לפי אימייל…' : 'Search by email…'}
          className="flex-1 min-w-[180px] px-3 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-stone-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-900/20 dark:focus:ring-indigo-500/30"
        />
        <select
          value={tier}
          onChange={(e) => { setTier(e.target.value as 'all' | 'free' | 'pro'); setPage(0); }}
          className="px-3 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-stone-900 dark:text-zinc-100 outline-none"
        >
          <option value="all">{isHebrew ? 'כל התוכניות' : 'All plans'}</option>
          <option value="free">{isHebrew ? 'חינם' : 'Free'}</option>
          <option value="pro">{isHebrew ? 'פרו' : 'Pro'}</option>
        </select>
      </div>

      {error && (
        <div className="mb-3 text-sm text-rose-600 dark:text-rose-400">{error}</div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-stone-400 dark:text-zinc-600 text-xs">
              <th className="text-start font-medium py-2 px-2">{isHebrew ? 'אימייל' : 'Email'}</th>
              <th className="text-start font-medium py-2 px-2">{isHebrew ? 'תוכנית' : 'Plan'}</th>
              <th className="text-start font-medium py-2 px-2">{isHebrew ? 'נוצר' : 'Joined'}</th>
              <th className="text-start font-medium py-2 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="py-6 text-center text-stone-400 dark:text-zinc-600">…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4} className="py-6 text-center text-stone-400 dark:text-zinc-600">{isHebrew ? 'לא נמצאו משתמשים' : 'No users found'}</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t border-stone-100 dark:border-zinc-800">
                  <td className="py-2.5 px-2 text-stone-900 dark:text-zinc-100">
                    <span className="truncate inline-block max-w-[240px] align-middle">{u.email ?? '—'}</span>
                    {u.deleted_at && (
                      <span className="ms-2 text-xs text-rose-500">{isHebrew ? '(נמחק)' : '(deleted)'}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-2">
                    <select
                      value={u.tier}
                      disabled={busyId === u.id}
                      onChange={(e) => changeTier(u, e.target.value as 'free' | 'pro')}
                      className={`px-2 py-1 rounded-md border text-xs outline-none disabled:opacity-50 ${
                        u.tier === 'pro'
                          ? 'border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                          : 'border-stone-300 dark:border-zinc-700 text-stone-600 dark:text-zinc-400'
                      } bg-white dark:bg-zinc-950`}
                    >
                      <option value="free">{isHebrew ? 'חינם' : 'Free'}</option>
                      <option value="pro">{isHebrew ? 'פרו' : 'Pro'}</option>
                    </select>
                  </td>
                  <td className="py-2.5 px-2 text-stone-500 dark:text-zinc-500 text-xs">
                    {new Date(u.created_at).toLocaleDateString(isHebrew ? 'he-IL' : 'en-US')}
                  </td>
                  <td className="py-2.5 px-2 text-end">
                    <button
                      onClick={() => removeUser(u)}
                      disabled={busyId === u.id}
                      className="text-xs text-rose-600 dark:text-rose-400 hover:underline disabled:opacity-50"
                    >
                      {isHebrew ? 'מחק' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm text-stone-500 dark:text-zinc-500">
        <span>
          {isHebrew ? `מציג ${from}–${to} מתוך ${total}` : `Showing ${from}–${to} of ${total}`}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
            className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-zinc-700 disabled:opacity-40 hover:bg-stone-50 dark:hover:bg-zinc-800"
          >
            {isHebrew ? 'הקודם' : 'Prev'}
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasNext || loading}
            className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-zinc-700 disabled:opacity-40 hover:bg-stone-50 dark:hover:bg-zinc-800"
          >
            {isHebrew ? 'הבא' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
