import { ImageResponse } from "next/og";

// Static link-preview image (1200×630) shown when kopelai.com is shared on
// WhatsApp, social, etc. Kept to the Latin wordmark + brand colors so it renders
// without fetching any external font — the Hebrew rich text comes from the page
// metadata description. Next wires this to og:image and twitter:image.
export const alt = "KopelAi — a reflective space for therapists";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1E1B4B 0%, #2a2566 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* K badge */}
        <div
          style={{
            width: 150,
            height: 150,
            borderRadius: 36,
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 44,
          }}
        >
          <div style={{ fontSize: 104, fontWeight: 700, color: "#1E1B4B" }}>K</div>
        </div>

        <div style={{ fontSize: 92, fontWeight: 700, color: "#ffffff", letterSpacing: -1 }}>
          KopelAi
        </div>

        <div
          style={{
            marginTop: 20,
            fontSize: 36,
            color: "#E7C9A3",
            maxWidth: 820,
            textAlign: "center",
            lineHeight: 1.3,
          }}
        >
          A reflective space for therapists
        </div>

        {/* clay accent rule */}
        <div style={{ marginTop: 40, width: 120, height: 6, borderRadius: 3, background: "#C8623D" }} />
      </div>
    ),
    { ...size }
  );
}
