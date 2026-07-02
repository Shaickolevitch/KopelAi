import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// MAINTENANCE MODE
// ---------------------------------------------------------------------------
// While this is ON, every visitor is shown app/maintenance (a friendly Hebrew
// "under maintenance" page) with an HTTP 503 status.
//
// The switch is a RUNTIME value in Supabase (app_settings.maintenance_mode),
// toggled from the admin page (Admin → תחזוקה) WITHOUT a redeploy. proxy.ts
// reads it here on each request, cached briefly per warm edge isolate.
//
// If the switch can't be read (DB unreachable / row missing), we fall back to
// the MAINTENANCE_MODE env var, defaulting to ON (safe for pre-launch).
// ---------------------------------------------------------------------------
function envDefaultMaintenance(): boolean {
  const v = process.env.MAINTENANCE_MODE;
  if (v === undefined) return true; // default: maintenance ON
  return v === "1" || v.toLowerCase() === "true";
}

// ---------------------------------------------------------------------------
// OWNER BYPASS
// ---------------------------------------------------------------------------
// While maintenance is ON, YOU can still use the real live site: visit
//     https://kopelai.com/?bypass=Jemzd8vPMJHw
// once. Your browser gets a cookie and from then on you see the full site,
// while everyone else keeps seeing the maintenance page. The cookie lasts 30
// days. To lock yourself back out, visit https://kopelai.com/?bypass=off .
// Change the key below to rotate it. (Optionally set MAINTENANCE_BYPASS_KEY.)
// ---------------------------------------------------------------------------
const BYPASS_KEY = process.env.MAINTENANCE_BYPASS_KEY || "Jemzd8vPMJHw";
const BYPASS_COOKIE = "kopelai-bypass";

// Cache the switch briefly so we don't hit Supabase on every single request.
// A toggle from the admin page takes effect within this window.
const SETTINGS_TTL_MS = 10_000;
let cached: { on: boolean; at: number } | null = null;

async function isMaintenanceOn(): Promise<boolean> {
  const now = Date.now();
  if (cached && now - cached.at < SETTINGS_TTL_MS) return cached.on;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    try {
      const r = await fetch(
        `${url}/rest/v1/app_settings?key=eq.maintenance_mode&select=value`,
        { headers: { apikey: key, authorization: `Bearer ${key}` }, cache: "no-store" }
      );
      if (r.ok) {
        const rows = (await r.json()) as { value?: string }[];
        if (rows.length > 0) {
          const v = (rows[0].value || "").toLowerCase();
          const on = v === "on" || v === "1" || v === "true";
          cached = { on, at: now };
          return on;
        }
      }
    } catch {
      /* fall through to fallback below */
    }
  }

  // Couldn't read the switch: reuse the last known value, else the env default.
  const fallback = cached?.on ?? envDefaultMaintenance();
  cached = { on: fallback, at: now };
  return fallback;
}

export async function proxy(request: NextRequest) {
  if (!(await isMaintenanceOn())) {
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
