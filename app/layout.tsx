import type { Metadata } from "next";
import { Geist, Geist_Mono, PT_Serif } from "next/font/google";
import localFont from 'next/font/local';
import { Suspense } from "react";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Footer } from "@/components/footer";
import { NavigationLoading } from "@/components/navigation-loading";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const ptSerif = PT_Serif({
  variable: '--font-pt-serif',
  subsets: ["latin"],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  preload: true,
});

const playpenSansArabic = localFont({
  src: [
    {
      path: '../public/fonts/static/PlaypenSansArabic-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/static/PlaypenSansArabic-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../public/fonts/static/PlaypenSansArabic-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../public/fonts/static/PlaypenSansArabic-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-playpen-sans-arabic',
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: "Flare Academy",
  description: "منصة تعليمية متكاملة",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="ar" dir="rtl" className={`${geistSans.variable} ${geistMono.variable} ${playpenSansArabic.variable} ${ptSerif.variable}`}>
      <body suppressHydrationWarning className="font-pt-serif" data-pt-serif={ptSerif.variable}>
        <Providers>
          <Suspense fallback={null}>
            <NavigationLoading />
          </Suspense>
          <div className="min-h-screen flex flex-col">
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
