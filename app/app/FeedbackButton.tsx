'use client';

import { useState } from 'react';
import { useLang } from '@/lib/i18n';
import { submitFeedback } from '@/lib/api';

const SUBJECTS = [
  { key: 'bug', he: 'תקלה / באג', en: 'Bug' },
  { key: 'feature', he: 'הצעה לשיפור', en: 'Suggestion' },
  { key: 'content', he: 'תוכן', en: 'Content' },
  { key: 'billing', he: 'תשלום ומנוי', en: 'Billing' },
  { key: 'other', he: 'אחר', en: 'Other' },
];

export default function FeedbackButton() {
  const { language } = useLang();
  const isHebrew = language === 'he';

  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('feature');
  const [headline, setHeadline] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setSubject('feature');
    setHeadline('');
    setContent('');
    setError('');
    setSent(false);
  }

  async function handleSubmit() {
    if (!headline.trim() || !content.trim()) {
      setError(isHebrew ? 'יש למלא כותרת ותוכן.' : 'Please fill in a headline and content.');
      return;
    }
    setSending(true);
    setError('');
    try {
      await submitFeedback(subject, headline, content);
      setSent(true);
      setTimeout(() => { setOpen(false); reset(); }, 1800);
    } catch {
      setError(isHebrew ? 'השליחה נכשלה. נסה שוב.' : 'Could not send. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => { reset(); setOpen(true); }}
        className="fixed bottom-5 end-5 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-indigo-950 dark:bg-indigo-600 text-white shadow-lg hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors"
        aria-label={isHebrew ? 'משוב' : 'Feedback'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span className="text-sm font-medium hidden sm:inline">{isHebrew ? 'משוב' : 'Feedback'}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 end-3 text-stone-400 hover:text-stone-600 dark:hover:text-zinc-200 transition-colors"
              aria-label={isHebrew ? 'סגור' : 'Close'}
            >
              ✕
            </button>

            {sent ? (
              <div className="py-8 text-center">
                <div className="text-3xl mb-2">🙏</div>
                <p className="text-stone-700 dark:text-zinc-200 font-medium">
                  {isHebrew ? 'תודה! המשוב נשלח.' : 'Thanks! Your feedback was sent.'}
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-stone-900 dark:text-zinc-100 mb-1">
                  {isHebrew ? 'שליחת משוב' : 'Send feedback'}
                </h2>
                <p className="text-sm text-stone-500 dark:text-zinc-500 mb-4">
                  {isHebrew ? 'נשמח לשמוע מה עובד, מה חסר, ומה אפשר לשפר.' : "Tell us what works, what's missing, and what we can improve."}
                </p>

                <label className="block text-sm text-stone-600 dark:text-zinc-400 mb-1">{isHebrew ? 'נושא' : 'Subject'}</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full mb-3 px-3 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-stone-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-900/20 dark:focus:ring-indigo-500/30"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s.key} value={s.key}>{isHebrew ? s.he : s.en}</option>
                  ))}
                </select>

                <label className="block text-sm text-stone-600 dark:text-zinc-400 mb-1">{isHebrew ? 'כותרת' : 'Headline'}</label>
                <input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  maxLength={200}
                  placeholder={isHebrew ? 'במשפט אחד - על מה מדובר?' : 'In one line - what is it about?'}
                  className="w-full mb-3 px-3 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-stone-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-900/20 dark:focus:ring-indigo-500/30"
                />

                <label className="block text-sm text-stone-600 dark:text-zinc-400 mb-1">{isHebrew ? 'תוכן' : 'Details'}</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={5000}
                  rows={5}
                  placeholder={isHebrew ? 'ספר לנו בהרחבה…' : 'Tell us more…'}
                  className="w-full mb-4 px-3 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-stone-900 dark:text-zinc-100 outline-none resize-y focus:ring-2 focus:ring-indigo-900/20 dark:focus:ring-indigo-500/30"
                />

                {error && <p className="text-sm text-rose-600 dark:text-rose-400 mb-3">{error}</p>}

                <button
                  onClick={handleSubmit}
                  disabled={sending}
                  className="w-full py-2.5 rounded-xl bg-indigo-950 dark:bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors disabled:opacity-60"
                >
                  {sending ? (isHebrew ? 'שולח…' : 'Sending…') : isHebrew ? 'שלח משוב' : 'Send feedback'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
