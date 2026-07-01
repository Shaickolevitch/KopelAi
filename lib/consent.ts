// Analytics consent store (client-only). Analytics/cookies must not fire until
// the user makes an affirmative choice — GDPR + Israeli privacy expectations.
// Values: 'granted' | 'denied' | null (undecided). This is separate from the
// marketing-email consent captured at signup ('kopelai.pending_consent').
export type ConsentValue = 'granted' | 'denied';

const KEY = 'kopelai.analytics_consent';
const EVENT = 'kopelai:consent-change';

export function getConsent(): ConsentValue | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(v: ConsentValue): void {
  try { localStorage.setItem(KEY, v); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent(EVENT, { detail: v })); } catch { /* ignore */ }
}

// Subscribe to consent changes (fires when setConsent is called). Returns an
// unsubscribe function.
export function onConsentChange(cb: (v: ConsentValue) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<ConsentValue>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
