import type { MetadataRoute } from 'next';

// Web App Manifest — makes KopelAi installable "like an app" (standalone window,
// home-screen icon). Next serves this at /manifest.webmanifest and auto-links it.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KopelAi — מרחב רפלקטיבי למטפלים',
    short_name: 'KopelAi',
    description: 'שיחה רפלקטיבית למטפלים — להבין את הדפוסים, החוזקות ונקודות העיוורון שלך לאורך זמן.',
    start_url: '/app/conversation',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1E1B4B',
    lang: 'he',
    dir: 'rtl',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
