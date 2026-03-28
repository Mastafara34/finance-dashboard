// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'FinTrack AI',
  description: 'Asisten keuangan pribadi yang cerdas',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FinTrack AI',
  },
  formatDetection: { telephone: false },
  icons: {
    apple: '/icons/icon-192.png',
    icon: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f0e0d',
};

import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={cn("font-sans", geist.variable)}>
      <head>
        {/* PWA iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FinTrack AI" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {/* PWA splash screens (optional tapi bagus) */}
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body style={{ margin: 0, padding: 0, background: 'var(--bg-secondary)', color: 'var(--text-main)' }}>
        {children}
        <Toaster richColors closeButton position="top-center" />
      </body>
    </html>
  );
}
