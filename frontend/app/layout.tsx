import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MotionProvider from "@/components/MotionProvider";
import SiteHeader from "@/components/SiteHeader";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Veritas — media review with evidence in view",
  description: "Review news links, images and short videos with source details, available file signals and independent evidence in one place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SiteHeader />

        <main className="flex-1">
          <MotionProvider>{children}</MotionProvider>
        </main>

        <footer className="site-footer border-t border-line">
          <div className="mx-auto grid max-w-[1320px] gap-4 px-4 py-6 text-xs text-ink-3 sm:px-8 md:grid-cols-[1fr_auto] md:items-center lg:px-12">
            <p>Automated estimate. Signals, not proof. Free-tier model providers may use inputs to improve their services.</p>
            <Link href="/about" className="font-medium text-ink-2 transition-colors hover:text-accent">Technical method <span aria-hidden>↗</span></Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
