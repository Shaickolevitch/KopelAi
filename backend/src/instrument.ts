// Sentry must be initialized before anything else is imported, so this file is
// imported first in index.ts. Inert until SENTRY_DSN is set.
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
  });
}
