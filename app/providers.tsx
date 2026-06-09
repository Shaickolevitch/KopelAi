'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import posthog from 'posthog-js';

let initialized = false;

// Initializes PostHog (EU host) and tracks page views for the App Router.
// Privacy-first defaults: session recording OFF (no replay of therapy chats),
// and identified-only profiles. Conversation content is never sent.
export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (initialized) return;
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return; // no key yet → analytics simply stays off
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: false, // captured manually below for client navigation
      disable_session_recording: true, // privacy: no screen replay of conversations
      autocapture: true, // clicks/navigation only — input values are masked by default
    });
    initialized = true;
  }, []);

  useEffect(() => {
    if (!initialized || !pathname) return;
    posthog.capture('$pageview', { $current_url: window.location.href });
  }, [pathname]);

  return <>{children}</>;
}
