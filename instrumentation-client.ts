import * as Sentry from '@sentry/nextjs';

// Client-side error monitoring. Inert until a DSN is set.
// No Session Replay — privacy: we never record therapy conversations.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || 'https://f9308533502db87777836e687e79d9da@o4511417013370880.ingest.de.sentry.io/4511535995682896';
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
