import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MotionProvider from "@/components/MotionProvider";
import SiteHeader from "@/components/SiteHeader";
import ChromaHalo from "@/components/ChromaHalo";

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
        <ChromaHalo />
        <SiteHeader />

        <main className="flex-1">
          <MotionProvider>{children}</MotionProvider>
        </main>

        <footer className="site-footer border-t border-line">
          <div className="mx-auto grid max-w-[1320px] gap-4 px-4 py-6 text-xs text-ink-3 sm:px-8 md:grid-cols-[1fr_auto] md:items-center lg:px-12">
            <p className="font-mono text-xs text-ink-2 italic">
              “Code doesn&apos;t lie. Even when the internet tries to.”{" "}
              <span className="not-italic text-ink-3 font-sans">— Mudit Agrawal</span>
            </p>
            <a
              href="https://github.com/muditagrawal-alt/Deepfake-and-Fake-News-Detector"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Veritas GitHub Repository"
              className="inline-flex items-center gap-2 rounded-control border border-line bg-elev px-3.5 py-1.5 text-xs font-medium text-ink-2 transition-colors hover:border-line-strong hover:text-white shrink-0"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>GitHub</span>
              <span aria-hidden className="text-ink-3">↗</span>
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
