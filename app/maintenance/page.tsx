import type { Metadata } from "next";

// Standalone maintenance page. Intentionally self-contained (inline styles, no
// data fetching, no backend calls) so it renders even when other parts of the
// system are down. Traffic is routed here by proxy.ts while maintenance mode is
// on. To take the site out of maintenance, see proxy.ts.

export const metadata: Metadata = {
  title: "בעבודות תחזוקה · KopelAi",
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return (
    <main
      dir="rtl"
      lang="he"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "linear-gradient(180deg, #f7f5ef 0%, #eef1ee 100%)",
        color: "#1f2a24",
        fontFamily:
          "var(--font-body), 'Assistant', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 520, width: "100%" }}>
        <div
          aria-hidden="true"
          style={{
            fontSize: 56,
            lineHeight: 1,
            marginBottom: 20,
          }}
        >
          🛠️
        </div>

        <h1
          style={{
            fontFamily:
              "var(--font-display), 'Frank Ruhl Libre', Georgia, serif",
            fontSize: 30,
            fontWeight: 700,
            margin: "0 0 14px",
          }}
        >
          KopelAi בעבודות תחזוקה
        </h1>

        <p style={{ fontSize: 18, lineHeight: 1.7, margin: "0 0 10px" }}>
          המערכת עוברת כרגע עבודות תחזוקה ותחזור לפעול בקרוב.
        </p>

        <p style={{ fontSize: 18, lineHeight: 1.7, margin: 0, opacity: 0.85 }}>
          אנו מתנצלים על אי הנוחות ומודים לכם על הסבלנות.
        </p>

        <p
          style={{
            marginTop: 28,
            fontSize: 14,
            opacity: 0.6,
          }}
        >
          KopelAi is undergoing scheduled maintenance and will be back shortly.
          We apologize for the inconvenience.
        </p>
      </div>
    </main>
  );
}
