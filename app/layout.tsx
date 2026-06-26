import type { Metadata } from "next";
import { Assistant, Frank_Ruhl_Libre } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { LangProvider } from "@/lib/i18n";
import AnalyticsProvider from "./providers";
import AccessibilityWidget from "./AccessibilityWidget";
import "./globals.css";

// Design "A": Assistant for body (clean Hebrew sans), Frank Ruhl Libre for
// headings (literary Hebrew serif — the analytic, thoughtful tone).
const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});
const frankRuhl = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-display",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kopelai.com";
const OG_DESCRIPTION =
  "שיחה רפלקטיבית למטפלים — להבין את הדפוסים, החוזקות ונקודות העיוורון שלך לאורך זמן.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "KopelAi — מרחב רפלקטיבי למטפלים",
    template: "%s · KopelAi",
  },
  description: OG_DESCRIPTION,
  applicationName: "KopelAi",
  // og:image is provided by app/opengraph-image.tsx (the file convention).
  openGraph: {
    type: "website",
    siteName: "KopelAi",
    locale: "he_IL",
    url: SITE_URL,
    title: "KopelAi — מרחב רפלקטיבי למטפלים",
    description: OG_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "KopelAi — מרחב רפלקטיבי למטפלים",
    description: OG_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${assistant.variable} ${frankRuhl.variable}`}>
      <head>
        {/* Prevent flash of wrong theme - reads localStorage before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('kopelai.theme');if(t==='dark')document.documentElement.classList.add('dark');else if(t==='light')document.documentElement.classList.remove('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <AnalyticsProvider>
          <LangProvider>
            {/* a11y-content wraps the page so the accessibility widget can apply
                contrast/spacing/link styles to content without affecting itself. */}
            <div id="a11y-content">{children}</div>
            <AccessibilityWidget />
          </LangProvider>
        </AnalyticsProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
