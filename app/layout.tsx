import type { Metadata, Viewport } from "next";
import "./globals.css";
import InstallPrompt from "@/components/pwa-install-prompt";
import { PWAProvider } from "@/components/pwa-context";

export const metadata: Metadata = {
  title: "Viáticos - Grosso Tractores",
  description: "Sistema de gestión de viáticos y comprobantes",
  manifest: "/manifest.json",
  themeColor: "#004589",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Viáticos Grosso",
  },
  icons: {
    icon: '/icon-192x192.png',
    apple: '/icon-192x192.png',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                const isScriptError = e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK');
                const isChunkError = e.message && /Loading chunk|missing|ChunkLoadError|Failed to load/i.test(e.message);
                const isChunkName = e.error && e.error.name && /ChunkLoadError/i.test(e.error.name);

                if (isScriptError || isChunkError || isChunkName) {
                  console.error('Recovering from ChunkLoadError (Capture) by reloading...');
                  window.location.href = window.location.href.split('?')[0] + '?t=' + new Date().getTime();
                }
              }, true);
              
              window.addEventListener('unhandledrejection', function(e) {
                if (e.reason && e.reason.message && /Loading chunk|missing|ChunkLoadError/i.test(e.reason.message)) {
                  console.error('Recovering from ChunkLoadError (Promise) by reloading...');
                  window.location.href = window.location.href.split('?')[0] + '?t=' + new Date().getTime();
                }
              });

              // Register Service Worker for PWA Install Prompt Support
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/service-worker.js').then(
                    function(registration) {
                      console.log('Service Worker registration successful with scope: ', registration.scope);
                    },
                    function(err) {
                      console.log('Service Worker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <PWAProvider>
          {children}
          <InstallPrompt />
        </PWAProvider>
      </body>
    </html>
  );
}
