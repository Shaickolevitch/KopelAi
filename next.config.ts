import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/privacy', destination: '/privacy/index.html' },
      { source: '/privacy/', destination: '/privacy/index.html' },
      { source: '/privacy-he', destination: '/privacy-he/index.html' },
      { source: '/privacy-he/', destination: '/privacy-he/index.html' },
      { source: '/terms', destination: '/terms/index.html' },
      { source: '/terms/', destination: '/terms/index.html' },
      { source: '/terms-he', destination: '/terms-he/index.html' },
      { source: '/terms-he/', destination: '/terms-he/index.html' },
      { source: '/about', destination: '/about/index.html' },
      { source: '/about/', destination: '/about/index.html' },
      { source: '/about-he', destination: '/about-he/index.html' },
      { source: '/about-he/', destination: '/about-he/index.html' },
      { source: '/contact', destination: '/contact/index.html' },
      { source: '/contact/', destination: '/contact/index.html' },
      { source: '/contact-he', destination: '/contact-he/index.html' },
      { source: '/contact-he/', destination: '/contact-he/index.html' },
    ];
  },
};

export default nextConfig;