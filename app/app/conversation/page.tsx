'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT, useLang } from '@/lib/i18n';
import { sendChat, endConversation, understandFile, transcribeAudio, getUsage, startTrial, DailyLimitError, ChatMessage } from '@/lib/api';
import Onboarding from './Onboarding';
import ChatTabs from '../ChatTabs';
import { getCurrentUser, AuthUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  getSubscriptionTier,
  clearPreviousSession,
  startCheckout,
  invalidateSubscriptionCache,
} from '@/lib/subscription';
import { track } from '@/lib/analytics';

type DisplayMessage = ChatMessage & { id: string; attachmentName?: string };

// Render message text with clickable links (e.g. the Kopel lectures URL).
function renderWithLinks(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 break-all hover:opacity-80"
      >
        {part}
      </a>
    ) : (
      part
    )
  );
}

// ─── Upgrade nudge modal ───────────────────────────────────────────────────────
function UpgradeNudgeModal({
  onViewInsights,
  onUpgrade,
  onClose,
  isAnon,
}: {
  onViewInsights: () => void;
  onUpgrade: () => void;
  onClose: () => void;
  isAnon: boolean;
}) {
  const t = useT();
  const router = useRouter();

  function handleUpgrade() {
    if (isAnon) {
      router.push('/auth/signup?context=upgrade');
    } else {
      onUpgrade();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600 dark:text-indigo-400">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-stone-900 dark:text-zinc-100 mb-1">
            {t.upgrade_nudge_title}
          </h2>
          <p className="text-stone-500 dark:text-zinc-400 text-sm leading-relaxed">
            {t.upgrade_nudge_body}
          </p>
        </div>
        <div className="flex flex-col gap-2.5 pt-1">
          <button
            onClick={handleUpgrade}
            className="w-full py-2.5 rounded-xl bg-indigo-950 dark:bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors"
          >
            {t.upgrade_nudge_upgrade}
          </button>
          <button
            onClick={onViewInsights}
            className="w-full py-2.5 rounded-xl border border-stone-200 dark:border-zinc-700 text-stone-700 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors text-sm font-medium"
          >
            {t.upgrade_nudge_view}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Plan picker ───────────────────────────────────────────────────────────────
function PlanPicker({
  currency,
  onSelect,
  loading,
}: {
  currency: 'NIS' | 'USD';
  onSelect: (plan: 'monthly' | 'annual') => void;
  loading: boolean;
}) {
  const t = useT();
  return (
    <div className="space-y-2.5 pt-2">
      <button
        disabled={loading}
        onClick={() => onSelect('annual')}
        className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors disabled:opacity-50"
      >
        <div className="text-start">
          <div className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">{t.pricing_annual_label}</div>
          <div className="text-xs text-indigo-500 dark:text-indigo-400">{t.pricing_annual_saving}</div>
        </div>
        <div className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
          {currency === 'NIS' ? t.pricing_annual_price_nis : t.pricing_annual_price_usd}
        </div>
      </button>
      <button
        disabled={loading}
        onClick={() => onSelect('monthly')}
        className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-stone-200 dark:border-zinc-700 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
      >
        <div className="text-sm font-medium text-stone-700 dark:text-zinc-300">{t.pricing_monthly_label}</div>
        <div className="text-sm text-stone-600 dark:text-zinc-400">
          {currency === 'NIS' ? t.pricing_monthly_price_nis : t.pricing_monthly_price_usd}
        </div>
      </button>
      {loading && (
        <p className="text-xs text-center text-stone-400 dark:text-zinc-600">{t.pricing_cta_loading}</p>
      )}
    </div>
  );
}

// ─── Free-tier upgrade nudges ────────────────────────────────────────────────
// Escalating nudges at 16 / 32 / 64 messages, and an easter egg at 128.
// The first two are formal; the last two get progressively more cheeky.
type Nudge = { level: number; egg: boolean; text: string; cta: string };

function getNudge(count: number, isHebrew: boolean): Nudge | null {
  if (count >= 128) {
    return {
      level: 128,
      egg: true,
      text: isHebrew
        ? '128 הודעות בחינם?! טוב, ניצחת. קופלAI מתרשם עמוקות מהעקשנות שלך 🏆 אולי תשדרג כבר, ולו רק כדי שלא ירגיש מנוצל?'
        : "128 free messages?! Okay, you win. Kopel is genuinely impressed by your stamina 🏆 Maybe upgrade now - if only so he doesn't feel used?",
      cta: isHebrew ? 'בסדר, שכנעת' : 'Fine, you got me',
    };
  }
  if (count >= 64) {
    return {
      level: 64,
      egg: false,
      text: isHebrew
        ? '64 הודעות. קופלAI מתחיל להתקשר אליך - חבל שהוא ישכח את הכול ברגע שתסגור. בפרו הוא זוכר.'
        : "64 messages in. Kopel's getting a little attached - shame he'll forget all of it the moment you close the tab. Pro lets him remember.",
      cta: isHebrew ? 'שדרג לפרו' : 'Upgrade to Pro',
    };
  }
  if (count >= 32) {
    return {
      level: 32,
      egg: false,
      text: isHebrew
        ? 'עוד שיחה ארוכה, ועדיין בתוכנית החינמית. בפרו לא תתחיל מאפס בכל פעם - קופלAI ימשיך מאיפה שהפסקתם.'
        : "Another long session, still on the free plan. With Pro you won't start from scratch each time - Kopel picks up where you left off.",
      cta: isHebrew ? 'שדרג לפרו' : 'Upgrade to Pro',
    };
  }
  if (count >= 16) {
    return {
      level: 16,
      egg: false,
      text: isHebrew
        ? 'אם השיחה מועילה לך - בתוכנית פרו קופלAI זוכר אותך בין מפגשים ומפיק תובנות אישיות.'
        : "If you're finding this valuable - Pro lets Kopel remember you between sessions and build personal insights.",
      cta: isHebrew ? 'שדרג לפרו' : 'Upgrade to Pro',
    };
  }
  return null;
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ConversationPage() {
  const t = useT();
  const { language } = useLang();
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // When the current sitting began — set on the first message of this mount, so
  // Kopel can be aware of how long the session has run and wind it down ~50 min in.
  const sessionStartRef = useRef<number | null>(null);
  const [showUpgradeNudge, setShowUpgradeNudge] = useState(false);
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [currency, setCurrency] = useState<'NIS' | 'USD'>('USD');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [tier, setTier] = useState<'free' | 'pro' | null>(null);
  const [dismissedNudgeLevel, setDismissedNudgeLevel] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [wallIsTrial, setWallIsTrial] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [trialAvailable, setTrialAvailable] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string; text: string } | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [composerDragOver, setComposerDragOver] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  async function handleToggleRecord() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Pick a format the device actually supports. iOS Safari records audio/mp4,
      // not webm — recording then labeling it webm makes transcription fail.
      const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg'];
      const mimeType = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported)
        ? (preferred.find((t) => MediaRecorder.isTypeSupported(t)) || '')
        : '';
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        setRecording(false);
        // Use the recorder's real format so the file extension/MIME match the bytes.
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || mimeType || 'audio/webm' });
        if (blob.size === 0) return;
        setTranscribing(true);
        try {
          const text = await transcribeAudio(blob, language);
          if (text) setInputText((prev) => (prev ? prev + ' ' : '') + text);
        } catch (err) {
          console.error('Transcribe failed:', err);
          const detail = err instanceof Error ? ` (${err.message})` : '';
          setError((language === 'he' ? 'התמלול נכשל. נסה שוב.' : 'Transcription failed. Try again.') + detail);
        } finally {
          setTranscribing(false);
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch (err) {
      console.error('Mic error:', err);
      setError(language === 'he' ? 'לא ניתן לגשת למיקרופון. בדוק הרשאות בדפדפן.' : 'Could not access the microphone. Check browser permissions.');
    }
  }

  useEffect(() => {
    try {
      if (localStorage.getItem('kopelai.onboarded') !== '1') setShowOnboarding(true);
    } catch {}
  }, []);

  async function handleAttach(file: File | undefined) {
    if (!file) return;
    setError(null);
    setAttaching(true);
    try {
      const { text } = await understandFile(file, language);
      setAttachment({ name: file.name, text });
    } catch (err) {
      console.error('Attach failed:', err);
      setError(language === 'he' ? 'לא הצלחתי לקרוא את הקובץ. נסה קובץ אחר.' : "Couldn't read that file. Try another.");
    } finally {
      setAttaching(false);
    }
  }

  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function init() {
      const u = await getCurrentUser();
      setUser(u);
      if (!u) return;

      const tier = await getSubscriptionTier(u.id);
      setTier(tier);

      // Trial countdown + daily-wall state (works for all authed users).
      try {
        const usage = await getUsage();
        if (usage.trial && (usage.trialDaysLeft ?? 0) > 0) setTrialDaysLeft(usage.trialDaysLeft ?? 0);
        if (usage.trialAvailable) setTrialAvailable(true);
        if (usage.reached) { setLimitReached(true); setWallIsTrial(!!usage.trial); }
      } catch { /* fail open */ }

      if (tier === 'free') {
        // Wipe previous session data so free users start clean each time.
        await clearPreviousSession(u.id);
      } else {
        // Pro users: restore any active conversation.
        const { data: activeConvo } = await supabase()
          .from('conversations').select('id').eq('user_id', u.id)
          .is('ended_at', null).is('deleted_at', null)
          .order('started_at', { ascending: false }).limit(1).maybeSingle();

        if (activeConvo) {
          const { data: existingMessages } = await supabase()
            .from('messages').select('id, role, content')
            .eq('conversation_id', activeConvo.id).is('deleted_at', null)
            .order('created_at', { ascending: true });

          if (existingMessages && existingMessages.length > 0) {
            setConversationId(activeConvo.id);
            setMessages(existingMessages.map((m: { id: string; role: string; content: string }) => ({
              id: m.id, role: m.role as 'user' | 'assistant', content: m.content,
            })));
          }
        }
      }

      // Detect currency for the upgrade UI
      try {
        const res = await fetch('/api/ching/currency');
        const { currency: c } = await res.json();
        setCurrency(c);
      } catch { /* default USD */ }
    }
    init();
  }, []);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`; }
  }, [inputText]);

  // Put the cursor in the composer on entry and again each time Kopel finishes
  // replying, so you can just start typing. Skips the wall/onboarding states.
  useEffect(() => {
    if (user && !sending && !limitReached && !showOnboarding) {
      textareaRef.current?.focus();
    }
  }, [user, sending, limitReached, showOnboarding]);

  async function ensureConversation(uid: string): Promise<string> {
    if (conversationId) return conversationId;
    const { data, error: insertErr } = await supabase()
      .from('conversations').insert({ user_id: uid, language, started_at: new Date().toISOString() })
      .select('id').single();
    if (insertErr || !data) throw new Error(insertErr?.message ?? 'Failed to create conversation');
    setConversationId(data.id);
    track('conversation_started');
    return data.id;
  }

  async function persistMessage(convId: string, uid: string, role: 'user' | 'assistant', content: string) {
    await supabase().from('messages').insert({
      conversation_id: convId, user_id: uid, role, content, language, created_at: new Date().toISOString(),
    });
  }

  // Reveal an assistant message progressively, character-by-character, so it
  // feels like KopelAi is typing in real time. ~22ms/char ≈ a comfortable read pace.
  function typeOutAssistantMessage(messageId: string, fullText: string): Promise<void> {
    const CHAR_DELAY_MS = 22;
    return new Promise((resolve) => {
      let i = 0;
      const tick = () => {
        i = Math.min(i + 1, fullText.length);
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, content: fullText.slice(0, i) } : m))
        );
        if (i < fullText.length) {
          setTimeout(tick, CHAR_DELAY_MS);
        } else {
          resolve();
        }
      };
      tick();
    });
  }

  async function handleSend() {
    if (!user || sending) return;
    const trimmed = inputText.trim();
    const att = attachment;
    if (!trimmed && !att) return;
    setError(null);
    setSending(true);

    try {
      const convId = await ensureConversation(user.id);
      // What the user sees in their bubble (their text + a paperclip chip).
      const displayText = trimmed || (language === 'he' ? '(קובץ מצורף)' : '(attached file)');
      const userMsg: DisplayMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: displayText,
        attachmentName: att?.name,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputText('');
      setAttachment(null);

      // What the model actually receives (includes the understood file content).
      const fullContent = att
        ? `${trimmed}\n\n[${language === 'he' ? 'תוכן הקובץ' : 'File content'} "${att.name}"]:\n${att.text}`.trim()
        : trimmed;

      await persistMessage(convId, user.id, 'user', fullContent);

      const history: ChatMessage[] = [
        ...messages.map(({ role, content }) => ({ role, content })),
        { role: 'user', content: fullContent },
      ];
      // Track the sitting's length so Kopel can steer toward a close ~50 min in.
      if (sessionStartRef.current === null) sessionStartRef.current = Date.now();
      const sessionMinutes = Math.floor((Date.now() - sessionStartRef.current) / 60000);
      const response = await sendChat(history, language, sessionMinutes);

      // Insert the assistant bubble empty, then type out the response.
      const assistantId = crypto.randomUUID();
      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);
      // Stop the "thinking" dots immediately - the empty bubble + typing animation takes over.
      setSending(false);
      await typeOutAssistantMessage(assistantId, response.text);
      await persistMessage(convId, user.id, 'assistant', response.text);
      // That was the last message in today's free quota — the reply already
      // wound down gracefully on the server, so now show the wall.
      if (response.remaining === 0) setLimitReached(true);
    } catch (err) {
      if (err instanceof DailyLimitError) {
        // Hit the wall (e.g. returning user, or a race). Lock without an error toast.
        setWallIsTrial(err.trial);
        setLimitReached(true);
        setSending(false);
        return;
      }
      console.error('Send failed:', err);
      setError(t.conversation_send_failed);
      setSending(false);
    }
  }

  async function handleEndSession() {
    if (!user || !conversationId || endingSession) return;
    setEndingSession(true);
    try {
      await endConversation(conversationId);
      const tier = await getSubscriptionTier(user.id);
      track('session_ended', { tier });
      if (tier === 'free') {
        setShowUpgradeNudge(true);
      } else {
        // Analysis is ready - take Pro users straight to the Analysis page.
        router.push('/app/insights');
      }
    } catch (err) {
      console.error('End session failed:', err);
      setError(t.conversation_end_failed);
    } finally {
      setEndingSession(false);
    }
  }

  async function handleStartTrial() {
    if (startingTrial) return;
    setStartingTrial(true);
    setError(null);
    try {
      const { trialDaysLeft: days } = await startTrial();
      invalidateSubscriptionCache();
      track('trial_started');
      // Switch the UI into trial (Pro) mode without a reload.
      setTier('pro');
      setTrialAvailable(false);
      setTrialDaysLeft(days);
      setLimitReached(false);
    } catch (err) {
      console.error('Start trial failed:', err);
      setError(language === 'he' ? 'לא הצלחנו להתחיל את הניסיון. נסו שוב.' : "Couldn't start the trial. Please try again.");
    } finally {
      setStartingTrial(false);
    }
  }

  async function handleSelectPlan(plan: 'monthly' | 'annual') {
    setCheckoutLoading(true);
    track('checkout_started', { plan });
    try {
      await startCheckout(plan);
    } catch (err) {
      console.error('Checkout failed:', err);
      setCheckoutLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 150, 300].map((d) => (
            <span key={d} className="w-2 h-2 rounded-full bg-stone-400 dark:bg-zinc-600 animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {endingSession && tier === 'pro' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-50/80 dark:bg-zinc-950/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 px-10 py-8 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-indigo-950 dark:bg-indigo-600 flex items-center justify-center animate-pulse">
              <span className="text-white font-bold text-lg leading-none">K</span>
            </div>
            <p className="text-stone-700 dark:text-zinc-200 font-medium text-[15px]">
              {language === 'he' ? 'קופלAI מנתח את השיחה' : 'Kopel is analyzing the conversation'}
            </p>
            <div className="flex gap-1.5">
              {[0, 150, 300].map((d) => (
                <span key={d} className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        </div>
      )}
      {showOnboarding && (
        <Onboarding
          onClose={() => {
            try { localStorage.setItem('kopelai.onboarded', '1'); } catch {}
            setShowOnboarding(false);
          }}
        />
      )}
      {showUpgradeNudge && !showPlanPicker && (
        <UpgradeNudgeModal
          isAnon={user.isAnonymous}
          onViewInsights={() => { setShowUpgradeNudge(false); window.location.reload(); }}
          onUpgrade={() => { setShowUpgradeNudge(false); setShowPlanPicker(true); }}
          onClose={() => { setShowUpgradeNudge(false); window.location.reload(); }}
        />
      )}

      {showPlanPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPlanPicker(false)} />
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <button
              onClick={() => setShowPlanPicker(false)}
              className="absolute top-3 end-3 text-stone-400 hover:text-stone-600 dark:hover:text-zinc-200 transition-colors"
              aria-label={language === 'he' ? 'סגור' : 'Close'}
            >
              ✕
            </button>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-zinc-100">{t.settings_upgrade_title}</h2>
            <p className="text-sm text-stone-500 dark:text-zinc-400">{t.settings_upgrade_subtitle}</p>
            <PlanPicker currency={currency} onSelect={handleSelectPlan} loading={checkoutLoading} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-4 sm:px-6 py-4">
        <ChatTabs active="chat" />

        {/* Trial countdown (shown while the 14-day Pro trial is active) */}
        {trialDaysLeft > 0 && (
          <div className="mb-3 flex items-center gap-3 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 text-xs leading-snug">
            <span className="flex-1">
              {language === 'he'
                ? `נותרו ${trialDaysLeft} ימים בתקופת הניסיון - אחר כך קופלAI ישכח את מה שדיברתם. בפרו הוא ממשיך לזכור.`
                : `${trialDaysLeft} days left in your trial - after that Kopel forgets what you shared. Pro keeps the memory.`}
            </span>
            <button
              onClick={() => setShowPlanPicker(true)}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-indigo-950 dark:bg-indigo-600 text-white font-medium hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors"
            >
              {language === 'he' ? 'שדרגו לפרו' : 'Upgrade to Pro'}
            </button>
          </div>
        )}

        {/* Opt-in Pro trial offer (free users who haven't started one) */}
        {tier === 'free' && trialAvailable && (
          <div className="mb-3 flex items-center gap-3 px-3 py-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 text-xs leading-snug">
            <span className="flex-1">
              {language === 'he'
                ? 'רוצים לנסות את פרו? 14 ימי ניסיון חינם - זיכרון בין מפגשים, תובנות אישיות ועד 50 הודעות ביום.'
                : 'Want to try Pro? 14 free days - memory between sessions, personal insights, and up to 50 messages a day.'}
            </span>
            <button
              onClick={handleStartTrial}
              disabled={startingTrial}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-indigo-950 dark:bg-indigo-600 text-white font-medium hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors disabled:opacity-60"
            >
              {startingTrial
                ? (language === 'he' ? 'מתחילים…' : 'Starting…')
                : (language === 'he' ? 'התחילו ניסיון חינם' : 'Start free trial')}
            </button>
          </div>
        )}

        {/* Permanent free-tier notice */}
        {tier === 'free' && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs leading-snug">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
            </svg>
            <span>
              {language === 'he'
                ? 'זו הגרסה החינמית - אם תעזוב את העמוד, השיחה תימחק.'
                : 'This is the free version - if you leave the page, the conversation will be erased.'}
            </span>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full min-h-[40vh]">
              <div className="text-center max-w-sm">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mx-auto mb-4">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">K</span>
                </div>
                <p className="text-stone-500 dark:text-zinc-500 leading-relaxed whitespace-pre-line text-[15px]">
                  {t.conversation_empty_hint}
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-indigo-950 dark:bg-indigo-600 flex items-center justify-center shrink-0 mb-0.5">
                  <span className="text-white font-bold text-[10px] leading-none">K</span>
                </div>
              )}
              <div className={`max-w-[80%] px-4 py-3 shadow-sm text-[15px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-950 dark:bg-indigo-600 text-white rounded-2xl rounded-br-sm'
                  : 'bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 text-stone-900 dark:text-zinc-100 rounded-2xl rounded-bl-sm'
              }`}>
                <p className="whitespace-pre-wrap">{renderWithLinks(msg.content)}</p>
                {msg.attachmentName && (
                  <div className="mt-1.5 flex items-center gap-1 text-xs opacity-80">
                    <span>📎</span><span className="truncate">{msg.attachmentName}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start items-end gap-2">
              <div className="w-7 h-7 rounded-full bg-indigo-950 dark:bg-indigo-600 flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-[10px] leading-none">K</span>
              </div>
              <div className="px-4 py-3.5 rounded-2xl rounded-bl-sm bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 shadow-sm">
                <div className="flex gap-1.5">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="w-2 h-2 bg-stone-400 dark:bg-zinc-500 rounded-full animate-bounce"
                      style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={scrollAnchorRef} />
        </div>

        {error && (
          <div className="mb-3 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            {error}
          </div>
        )}

        {(attachment || attaching || recording || transcribing) && (
          <div className="mb-2 flex items-center gap-2 text-sm text-stone-600 dark:text-zinc-400">
            {recording ? (
              <span className="inline-flex items-center gap-2 text-red-600 dark:text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                {language === 'he' ? 'מקליט… לחץ על העצור כדי לסיים' : 'Recording… tap stop to finish'}
              </span>
            ) : transcribing ? (
              <span>{language === 'he' ? 'מתמלל…' : 'Transcribing…'}</span>
            ) : attaching ? (
              <span>{language === 'he' ? 'קורא את הקובץ…' : 'Reading the file…'}</span>
            ) : attachment ? (
              <span className="inline-flex items-center gap-1.5 bg-stone-100 dark:bg-zinc-800 rounded-full px-3 py-1">
                <span>📎</span>
                <span className="truncate max-w-[200px]">{attachment.name}</span>
                <button onClick={() => setAttachment(null)} className="text-stone-400 hover:text-stone-600 dark:hover:text-zinc-200" aria-label={language === 'he' ? 'הסר' : 'Remove'}>✕</button>
              </span>
            ) : null}
          </div>
        )}

        {/* Escalating in-chat upgrade nudges for free users (16/32/64, easter egg at 128) */}
        {(() => {
          if (tier !== 'free' || showUpgradeNudge || showPlanPicker) return null;
          const nudge = getNudge(messages.length, language === 'he');
          if (!nudge || nudge.level <= dismissedNudgeLevel) return null;
          return (
            <div
              className={`mb-3 flex items-center gap-3 px-4 py-2.5 rounded-xl border ${
                nudge.egg
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                  : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800'
              }`}
            >
              <span
                className={`text-sm flex-1 leading-snug ${
                  nudge.egg
                    ? 'text-amber-900 dark:text-amber-200'
                    : 'text-indigo-900 dark:text-indigo-200'
                }`}
              >
                {nudge.text}
              </span>
              <button
                onClick={() => setShowPlanPicker(true)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors ${
                  nudge.egg
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-indigo-950 dark:bg-indigo-600 hover:bg-indigo-900 dark:hover:bg-indigo-500'
                }`}
              >
                {nudge.cta}
              </button>
              <button
                onClick={() => setDismissedNudgeLevel(nudge.level)}
                className={`shrink-0 transition-colors ${
                  nudge.egg
                    ? 'text-amber-400 hover:text-amber-700 dark:hover:text-amber-200'
                    : 'text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200'
                }`}
                aria-label={language === 'he' ? 'סגור' : 'Dismiss'}
              >
                ✕
              </button>
            </div>
          );
        })()}

        {/* Daily hard wall for free users */}
        {limitReached && (
          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 p-5 text-center space-y-3">
            <div className="w-11 h-11 rounded-full bg-indigo-950 dark:bg-indigo-600 flex items-center justify-center mx-auto">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-stone-900 dark:text-zinc-100">{wallIsTrial ? t.trial_limit_title : t.daily_limit_title}</h2>
            <p className="text-sm text-stone-600 dark:text-zinc-300 leading-relaxed max-w-md mx-auto">{wallIsTrial ? t.trial_limit_body : t.daily_limit_body}</p>
            <button
              onClick={() => setShowPlanPicker(true)}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-indigo-950 dark:bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-900 dark:hover:bg-indigo-500 transition-colors"
            >
              {wallIsTrial ? t.trial_limit_cta_upgrade : t.daily_limit_cta_upgrade}
            </button>
            <p className="text-xs text-stone-400 dark:text-zinc-600">{t.daily_limit_cta_tomorrow}</p>
          </div>
        )}

        {!limitReached && (<>
        <div
          onDragOver={(e) => { e.preventDefault(); if (!sending && !attaching) setComposerDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setComposerDragOver(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setComposerDragOver(false);
            if (sending || attaching) return;
            const file = e.dataTransfer.files?.[0];
            if (file) handleAttach(file);
          }}
          className={`flex items-end gap-2 bg-white dark:bg-zinc-900 border rounded-2xl px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-900/10 dark:focus-within:ring-indigo-500/20 transition-all ${
            composerDragOver
              ? 'border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-400/30'
              : 'border-stone-300 dark:border-zinc-700 focus-within:border-indigo-400 dark:focus-within:border-indigo-600'
          }`}
        >
          <label
            className="w-8 h-8 rounded-full text-stone-400 hover:text-stone-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
            title={language === 'he' ? 'צרף תמונה או קובץ' : 'Attach an image or file'}
          >
            <input
              type="file"
              accept="image/*,audio/*,.pdf,.docx,.txt,.md,.mp3,.m4a,.wav,.ogg,.aac"
              disabled={sending || attaching}
              onChange={(e) => { handleAttach(e.target.files?.[0]); e.target.value = ''; }}
              className="hidden"
            />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </label>
          <button
            type="button"
            onClick={handleToggleRecord}
            disabled={sending || attaching || transcribing}
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors disabled:opacity-40 ${
              recording
                ? 'bg-red-500 text-white animate-pulse'
                : 'text-stone-400 hover:text-stone-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800'
            }`}
            title={recording ? (language === 'he' ? 'עצור הקלטה' : 'Stop recording') : (language === 'he' ? 'הקלטה קולית' : 'Voice recording')}
            aria-label={recording ? 'Stop recording' : 'Record'}
          >
            {recording ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" />
              </svg>
            )}
          </button>
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={t.conversation_input_placeholder}
            disabled={sending}
            rows={1}
            className="flex-1 resize-none outline-none bg-transparent leading-relaxed py-1.5 max-h-40 text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 dark:placeholder:text-zinc-600 text-[15px]"
          />
          <button
            onClick={handleSend}
            disabled={sending || attaching || (!inputText.trim() && !attachment)}
            className="w-8 h-8 rounded-full bg-indigo-950 dark:bg-indigo-600 text-white hover:bg-indigo-900 dark:hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center shrink-0"
            aria-label={language === 'he' ? 'שלח' : 'Send'}
            title={language === 'he' ? 'שלח' : 'Send'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>

        <p className="mt-2 text-center text-sm text-stone-400 dark:text-zinc-600">
          {language === 'he' ? '🔒 השיחות שלך פרטיות ומוצפנות' : '🔒 Your conversations are private and encrypted'}
        </p>
        </>)}

        {messages.length > 0 && !limitReached && (
          <div className="mt-3 text-center space-y-2">
            <p className="text-sm text-stone-500 dark:text-zinc-500 leading-snug px-4">
              {tier === 'free'
                ? (language === 'he' ? 'ניתוח השיחה זמין בתוכנית פרו' : 'Session analysis is available on Pro')
                : t.conversation_end_session_hint}
            </p>
            <button
              onClick={handleEndSession}
              disabled={endingSession || sending}
              className={`inline-flex items-center justify-center px-6 py-3 rounded-xl text-base font-semibold shadow-sm disabled:opacity-50 transition-colors ${
                tier === 'free'
                  ? 'bg-stone-200 dark:bg-zinc-800 text-stone-400 dark:text-zinc-500 hover:bg-stone-300 dark:hover:bg-zinc-700'
                  : 'bg-indigo-950 dark:bg-indigo-600 text-white hover:bg-indigo-900 dark:hover:bg-indigo-500'
              }`}
            >
              {endingSession
                ? (language === 'he' ? 'מנתח את השיחה…' : 'Analyzing…')
                : tier === 'free'
                ? `🔒 ${t.conversation_end_session}`
                : t.conversation_end_session}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
