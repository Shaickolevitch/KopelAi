// Thin, safe wrapper around PostHog. Every call is a no-op until PostHog is
// initialized (e.g. before the key is set), so it never throws.
//
// PRIVACY: never pass conversation content, message text, or anything a client
// said into track()/identify(). Only pass counts, ids, tiers, and UI context.
import posthog from 'posthog-js';

function ready(): boolean {
  try {
    return typeof window !== 'undefined' && Boolean((posthog as unknown as { __loaded?: boolean }).__loaded);
  } catch {
    return false;
  }
}

export function track(event: string, props?: Record<string, unknown>) {
  if (ready()) {
    try { posthog.capture(event, props); } catch { /* ignore */ }
  }
}

export function identifyUser(id: string, props?: Record<string, unknown>) {
  if (ready()) {
    try { posthog.identify(id, props); } catch { /* ignore */ }
  }
}

export function resetAnalytics() {
  if (ready()) {
    try { posthog.reset(); } catch { /* ignore */ }
  }
}
