import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MotionProvider from "@/components/MotionProvider";
import SiteHeader from "@/components/SiteHeader";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Veritas: is it real?",
  description: "Check a news link, image or short video. File provenance, a model's analysis and independent evidence, with the sources shown.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SiteHeader />

        <main className="flex-1">
          <MotionProvider>{children}</MotionProvider>
        </main>

        <footer className="border-t border-line">
          <div className="mx-auto max-w-[1320px] px-4 py-6 text-xs text-ink-3 sm:px-8 lg:px-12">
            <p>Automated estimate: signals, not proof. Free-tier model providers may use inputs to improve their services.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
