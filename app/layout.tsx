import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, PT_Serif } from "next/font/google";
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

const inter = Inter({
  variable: '--font-inter',
  subsets: ["latin"],
  display: 'swap',
  preload: true,
});

const ptSerif = PT_Serif({
  variable: '--font-pt-serif',
  subsets: ["latin"],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
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
    <html suppressHydrationWarning lang="ar" dir="rtl" className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${ptSerif.variable}`}>
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
