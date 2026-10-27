import { withContentCollections } from '@content-collections/next';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

/**
 * https://nextjs.org/docs/app/api-reference/config/next-config-js
 */
const nextConfig: NextConfig = {
  devIndicators: false,

  // NextURL 15 rewrites loopback literals even inside OAuth query values.
  // Keep the original URL; middleware also restores its search before locale routing.
  skipMiddlewareUrlNormalize: true,

  // Mastra is a Node-only Agent runtime. Keep it out of the webpack server
  // bundle so Vercel can trace the package directly instead of minifying it.
  serverExternalPackages: ['@mastra/core'],

  // Keep diagnostics observable on Vercel Preview while preserving the
  // existing console stripping behavior for Production and local builds.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production' &&
      process.env.VERCEL_ENV !== 'preview',
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'randomuser.me',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
      },
      {
        protocol: 'https',
        hostname: 'html.tailus.io',
      },
    ],
  },

  // Production optimizations
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },

  async redirects() {
    return [
      {
        source: '/blog',
        destination: '/',
        permanent: true,
      },
      {
        source: '/blog/:path*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/:locale/blog',
        destination: '/',
        permanent: true,
      },
      {
        source: '/:locale/blog/:path*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/docs',
        destination: '/',
        permanent: true,
      },
      {
        source: '/docs/:path*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/:locale/docs',
        destination: '/',
        permanent: true,
      },
      {
        source: '/:locale/docs/:path*',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

/**
 * You can specify the path to the request config file or use the default one (@/i18n/request.ts)
 *
 * https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing#next-config
 */
const withNextIntl = createNextIntlPlugin();

/**
 * withContentCollections must be the outermost plugin
 *
 * https://www.content-collections.dev/docs/quickstart/next
 */
export default withContentCollections(withNextIntl(nextConfig));
