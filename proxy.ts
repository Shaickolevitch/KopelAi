import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// MAINTENANCE MODE
// ---------------------------------------------------------------------------
// While this is ON, every visitor to the site is shown app/maintenance
// (a friendly "under maintenance" page) with an HTTP 503 status.
//
// HOW TO TURN IT OFF (two options):
//   1. In Vercel → Project → Settings → Environment Variables, set
//        MAINTENANCE_MODE = 0
//      then redeploy. No code change needed.
//   2. Or change the default below to `false` and push to GitHub.
//
// Default is ON so the page goes live immediately on deploy.
// ---------------------------------------------------------------------------
const MAINTENANCE_MODE =
  process.env.MAINTENANCE_MODE === undefined
    ? true // default: maintenance ON
    : process.env.MAINTENANCE_MODE === "1" ||
      process.env.MAINTENANCE_MODE.toLowerCase() === "true";

export function proxy(request: NextRequest) {
  if (!MAINTENANCE_MODE) {
    return NextResponse.next();
  }

  // Don't rewrite the maintenance page onto itself.
  if (request.nextUrl.pathname.startsWith("/maintenance")) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/maintenance";

  return NextResponse.rewrite(url, {
    status: 503,
    headers: { "Retry-After": "3600" },
  });
}

export const config = {
  // Run on everything EXCEPT Next.js internals and static asset files, so the
  // maintenance page's own CSS/fonts/images still load.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest|woff|woff2|ttf|otf)$).*)",
  ],
};
