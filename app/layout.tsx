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
                if (/Loading chunk|missing|ChunkLoadError/i.test(e.message)) {
                  console.error('Recovering from ChunkLoadError by reloading...');
                  window.location.href = window.location.href.split('?')[0] + '?t=' + new Date().getTime();
                }
              });
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
