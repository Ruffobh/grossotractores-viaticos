import type { NextConfig } from 'next'; // Fix for Hostinger build
// PWA Config handled at export


const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverComponentsExternalPackages: ['xlsx', 'exceljs', 'nodemailer', '@google/generative-ai'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'yagyzvvupixmjovyzveu.supabase.co',
        port: '',
        pathname: '/**', // Allow all paths
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/((?!_next|static|favicon.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  // Temporarily disable PWA to test if it's causing Vercel internal errors
  disable: true,
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swMinify: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

export default withPWA(nextConfig);
