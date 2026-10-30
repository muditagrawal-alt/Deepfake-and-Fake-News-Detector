"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

export default function SiteHeader() {
  const reduceMotion = useReducedMotion();

  function handleHowItWorks(event: React.MouseEvent<HTMLAnchorElement>) {
    if (window.location.pathname !== "/") return;
    const stage = document.querySelector<HTMLElement>("[data-app-stage]")?.dataset.appStage;
    if (stage !== "landing" && stage !== "workspace") return;

    event.preventDefault();
    window.dispatchEvent(new Event("veritas:how-it-works"));
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-bg/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between gap-6 px-4 sm:px-8 lg:px-12">
        <Link href="/" aria-label="Veritas home" className="group inline-flex items-center gap-2.5 rounded-control text-ink">
          <motion.span
            whileHover={reduceMotion ? undefined : { rotate: -8, scale: 1.05 }}
            whileTap={reduceMotion ? undefined : { scale: 0.92 }}
            className="grid size-8 place-items-center rounded-[10px] border border-line-strong bg-elev font-mono text-sm font-semibold tracking-[-0.08em] text-accent transition-colors group-hover:border-accent/40"
          >V</motion.span>
          <span className="text-[15px] font-semibold tracking-[-0.045em]">veritas</span>
        </Link>

        <nav aria-label="Main" className="flex items-center gap-2 sm:gap-5">
          <Link href="/about" onClick={handleHowItWorks} className="rounded-control px-3 py-2 text-sm font-medium text-ink-2 transition-colors hover:text-ink focus-visible:outline">
            How it works
          </Link>
          <span aria-hidden className="hidden h-5 w-px bg-line-strong sm:block" />
          <span className="hidden text-xs text-ink-3 sm:block">Evidence, with context</span>
        </nav>
      </div>
    </header>
  );
}
