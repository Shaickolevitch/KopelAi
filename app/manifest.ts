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
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
