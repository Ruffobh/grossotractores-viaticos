import type { NextConfig } from 'next'; // Fix for Hostinger build
// PWA Config handled at export


const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['xlsx', 'exceljs', 'nodemailer', '@google/generative-ai'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'yagyzvvupixmjovyzveu.supabase.co',
        port: '',
        pathname: '/**', // Allow all paths
      },
    ],
    unoptimized: true, // Temporarily disabled to debug Vercel serverless limit
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
export default nextConfig;
