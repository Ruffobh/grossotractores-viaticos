import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grosso Viaticos",
  description: "Expense management for Grosso Tractores",
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
                // Check if it's a script error (resource loading error often has e.target pointing to script tag)
                // OR if the message content matches chunk loading issues (though resource errors often have empty message but we check target)
                const isScriptError = e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK');
                const isChunkError = /Loading chunk|missing|ChunkLoadError/i.test(e.message);

                if (isScriptError || isChunkError) {
                  console.error('Recovering from ChunkLoadError (Capture) by reloading...');
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
