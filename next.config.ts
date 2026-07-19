import type { NextConfig } from "next";

/**
 * Next.js configuration.
 *
 * This file is read by both:
 *   - the local dev server (`next dev`)
 *   - Vercel's Next.js builder (which ignores `output: "standalone"` and uses
 *     its own serverless build, but respects `headers()`, `rewrites()`, etc.)
 *
 * The COOP / COEP headers below are duplicated in `vercel.json` so that they
 * also apply to static assets served by Vercel's CDN (Next.js `headers()` only
 * applies to routes handled by the Next.js runtime, not to `/_next/static/*`
 * or `/public/*` files on Vercel).
 */
const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
