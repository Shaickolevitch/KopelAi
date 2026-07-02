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

// ---------------------------------------------------------------------------
// OWNER BYPASS
// ---------------------------------------------------------------------------
// While maintenance is ON, YOU can still use the real live site: visit
//     https://kopelai.com/?bypass=Jemzd8vPMJHw
// once. Your browser gets a cookie and from then on you see the full site,
// while everyone else keeps seeing the maintenance page. The cookie lasts 30
// days. To lock yourself back out, clear the site's cookies (or visit
//     https://kopelai.com/?bypass=off ).
// Change the key below to rotate it. (Optionally set MAINTENANCE_BYPASS_KEY.)
// ---------------------------------------------------------------------------
const BYPASS_KEY = process.env.MAINTENANCE_BYPASS_KEY || "Jemzd8vPMJHw";
const BYPASS_COOKIE = "kopelai-bypass";

export function proxy(request: NextRequest) {
  if (!MAINTENANCE_MODE) {
    return NextResponse.next();
  }

  // Don't rewrite the maintenance page onto itself.
  if (request.nextUrl.pathname.startsWith("/maintenance")) {
    return NextResponse.next();
  }

  const bypassParam = request.nextUrl.searchParams.get("bypass");

  // Owner unlocking via the secret link → set cookie and let them through.
  if (bypassParam === BYPASS_KEY) {
    const res = NextResponse.next();
    res.cookies.set(BYPASS_COOKIE, BYPASS_KEY, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });
    return res;
  }

  // Owner locking themselves back out.
  if (bypassParam === "off") {
    const res = NextResponse.next();
    res.cookies.delete(BYPASS_COOKIE);
    return res;
  }

  // Already-unlocked browser (valid cookie) → show the real site.
  if (request.cookies.get(BYPASS_COOKIE)?.value === BYPASS_KEY) {
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
