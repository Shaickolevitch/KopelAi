import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kopelai.com';

// Public marketing + legal pages only. The app (/app/*) and auth (/auth/*) are
// disallowed in robots.ts and intentionally left out here.
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    '/',
    '/accessibility',
    '/about',
    '/about-he',
    '/privacy',
    '/privacy-he',
    '/terms',
    '/terms-he',
    '/contact',
    '/contact-he',
  ];

  return paths.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.6,
  }));
}
