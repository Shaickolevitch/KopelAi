// Sentry must be initialized before anything else is imported, so this file is
// imported first in index.ts. Inert until SENTRY_DSN is set.
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN || 'https://f9308533502db87777836e687e79d9da@o4511417013370880.ingest.de.sentry.io/4511535995682896';
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
  });
}
