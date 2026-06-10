import * as Sentry from '@sentry/nextjs';

// Client-side error monitoring. Inert until a DSN is set.
// No Session Replay — privacy: we never record therapy conversations.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || 'https://f9308533502db87777836e687e79d9da@o4511417013370880.ingest.de.sentry.io/4511535995682896';
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    // Filter out non-actionable noise: analytics requests blocked by ad/privacy
    // extensions (PostHog "Failed to fetch"), and errors thrown by injected
    // browser-extension scripts — none of these are bugs in KopelAi.
    ignoreErrors: [
      'Failed to fetch',
      'Load failed',
      'NetworkError when attempting to fetch resource',
      'TypeError: Failed to fetch',
      'The network connection was lost',
    ],
    denyUrls: [
      /eu\.i\.posthog\.com/,
      /eu-assets\.i\.posthog\.com/,
      /\/scripts\/content\//,
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
      /^safari-extension:\/\//,
      /extensions\//,
    ],
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
