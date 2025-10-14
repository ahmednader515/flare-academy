import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from 'next/font/local';
import "./globals.css";
import { Providers } from "@/components/providers";
import { Footer } from "@/components/footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playpenSansArabic = localFont({
  src: './fonts/PlaypenSansArabic-VariableFont_wght.ttf',
  variable: '--font-playpen-sans-arabic',
  display: 'swap',
  preload: true,
});

const ptSerif = localFont({
  src: [
    {
      path: './fonts/PT_Serif/PTSerif-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/PT_Serif/PTSerif-Italic.ttf',
      weight: '400',
      style: 'italic',
    },
    {
      path: './fonts/PT_Serif/PTSerif-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: './fonts/PT_Serif/PTSerif-BoldItalic.ttf',
      weight: '700',
      style: 'italic',
    },
  ],
  variable: '--font-pt-serif',
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
      <body suppressHydrationWarning className="font-playpen-sans-arabic" data-pt-serif={ptSerif.variable}>
        <Providers>
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
