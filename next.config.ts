import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,



/**
 * Next.js configuration for security headers.
 * This configuration sets various HTTP headers to enhance security.
 * It includes headers for DNS prefetch control, HSTS, X-Frame-Options,
 * X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy,
 * and Content-Security-Policy.
 */

  headers: async () => {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' blob: data:",
              "font-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              "block-all-mixed-content",
              "upgrade-insecure-requests",
              // Agrega los dominios de Firebase
              "connect-src 'self' https://n8n.srv828784.hstgr.cloud/ https://*.firebaseapp.com https://*.googleapis.com https://irina.makilacloud.com/",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
