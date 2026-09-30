import type { NextConfig } from 'next';

/**
 * The browser only ever talks to this Next.js origin. `/api/*` and `/uploads/*` are proxied to the NestJS
 * backend on the server side, so no backend URL, secret or CORS configuration leaks into client code.
 */
const backend = process.env.BACKEND_URL ?? 'http://127.0.0.1:4000';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ['*.e2b.app'],
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
      { source: '/uploads/:path*', destination: `${backend}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
