import type { NextConfig } from 'next';

/**
 * Security headers required by SECURITY_AND_PRIVACY.md §18.
 *
 * CSP is enforced in production and report-only in preview/development so that
 * violations can be observed before they break a deploy.
 */
const isProduction = process.env.NEXT_PUBLIC_APP_ENV === 'production';

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; 'unsafe-inline' is required until
  // a nonce-based strategy is wired through the document. Tracked in RISK_REGISTER.
  "script-src 'self' 'unsafe-inline'" + (isProduction ? '' : " 'unsafe-eval'"),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // Supabase REST/Auth/Realtime origins are the only external connections.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  {
    key: isProduction ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only',
    value: contentSecurityPolicy,
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=()',
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  ...(isProduction
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingExcludes: {
    '*': ['./nextjs-version/**/*', './vite-version/**/*', './docs/**/*'],
  },
  typescript: {
    // Type errors must fail the build. Never set this to true.
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
