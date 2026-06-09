import * as Sentry from '@sentry/nextjs';

// Client-side error monitoring. Inert until a DSN is set.
// No Session Replay — privacy: we never record therapy conversations.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
