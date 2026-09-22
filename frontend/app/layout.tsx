import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Veritas: is it real?",
  description: "Check a news link, image or short video. Local forensics plus an LLM fact-check, with the sources shown.",
};

const REPO = "https://github.com/muditagrawal-alt/Deepfake-and-Fake-News-Detector";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
          <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between gap-6">
            <Link href="/" className="text-[15px] font-semibold tracking-tight">Veritas</Link>
            <nav className="flex items-center gap-5 text-sm">
              <Link href="/about" className="text-ink-2 hover:text-ink transition-colors">How it works</Link>
              <a href={REPO} target="_blank" rel="noreferrer noopener" className="text-ink-2 hover:text-ink transition-colors">GitHub</a>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-line">
          <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-ink-3">
            <p>Automated estimate: signals, not proof. Free-tier model providers may use inputs to improve their services.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
