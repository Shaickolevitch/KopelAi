'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import posthog from 'posthog-js';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { getConsent, onConsentChange, type ConsentValue } from '@/lib/consent';

let initialized = false;

function initPosthog() {
  if (initialized) return;
  // PostHog project API key. This is a PUBLIC (publishable) client key - it is
  // exposed in the browser bundle by design, so it's safe to keep in code. An
  // env var overrides it if ever needed.
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_xY6frLwx3HE9MepYsRoo7WWstaoZrknK4fYfDWWkjTEx';
  if (!key) return;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false, // captured manually below for client navigation
    disable_session_recording: true, // privacy: no screen replay of conversations
    autocapture: true, // clicks/navigation only - input values are masked by default
  });
  initialized = true;
}

// Initializes PostHog (EU host) + Vercel Analytics ONLY after the user grants
// analytics consent (see ConsentBanner). Nothing fires — no cookies, no
// pageviews — while consent is undecided or denied. Privacy-first defaults:
// session recording OFF, identified-only profiles; conversation content is
// never sent.
export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [consent, setConsentState] = useState<ConsentValue | null>(null);

  // Read the stored choice on mount and react to later changes from the banner.
  useEffect(() => {
    setConsentState(getConsent());
    return onConsentChange((v) => setConsentState(v));
  }, []);

  useEffect(() => {
    if (consent === 'granted') initPosthog();
  }, [consent]);

  useEffect(() => {
    if (consent !== 'granted' || !initialized || !pathname) return;
    posthog.capture('$pageview', { $current_url: window.location.href });
  }, [pathname, consent]);

  return (
    <>
      {children}
      {consent === 'granted' && (
        <>
          <Analytics />
          <SpeedInsights />
        </>
      )}
    </>
  );
}
