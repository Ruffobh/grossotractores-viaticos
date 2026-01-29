import type { Metadata } from "next";
import "./globals.css";
import { ChunkErrorHandler } from "@/components/chunk-error-handler";

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
      <body className="antialiased">
        <ChunkErrorHandler />
        {children}
      </body>
    </html>
  );
}
