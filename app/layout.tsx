import type { Metadata } from "next";
import { Assistant, Frank_Ruhl_Libre } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { LangProvider } from "@/lib/i18n";
import AnalyticsProvider from "./providers";
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

export const metadata: Metadata = {
  title: "KopelAi",
  description: "A reflective conversation for therapists - understand your own strengths and patterns over time.",
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
          <LangProvider>{children}</LangProvider>
        </AnalyticsProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
