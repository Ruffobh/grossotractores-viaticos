import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Viáticos - Grosso Tractores",
  description: "Sistema de gestión de viáticos y comprobantes",
  manifest: "/manifest.json",
  themeColor: "#004589",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
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
                // Check if it's a script error (resource loading error often has e.target pointing to script tag)
                // OR if the message content matches chunk loading issues (though resource errors often have empty message but we check target)
                const isScriptError = e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK');
                const isChunkError = /Loading chunk|missing|ChunkLoadError|Failed to load/i.test(e.message);
                const isChunkName = e.error && /ChunkLoadError/i.test(e.error.name);

                if (isScriptError || isChunkError || isChunkName) {
                  console.error('Recovering from ChunkLoadError (Capture) by reloading...');
                  // Clear strict caches if possible? 
                  // We append timestamp
                  window.location.href = window.location.href.split('?')[0] + '?t=' + new Date().getTime();
                }
              }, true);
              window.addEventListener('unhandledrejection', function(e) {
                if (e.reason && /Loading chunk|missing|ChunkLoadError/i.test(e.reason.message)) {
                  console.error('Recovering from ChunkLoadError (Promise) by reloading...');
                  window.location.href = window.location.href.split('?')[0] + '?t=' + new Date().getTime();
                }
              });
            `,
          }}
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
