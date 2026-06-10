import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { LangProvider } from "@/lib/i18n";
import AnalyticsProvider from "./providers";
import "./globals.css";

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
    <html lang="he" dir="rtl">
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
