"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "@phosphor-icons/react";

function stage() {
  return document.querySelector<HTMLElement>("[data-app-stage]")?.dataset.appStage;
}

export default function SiteHeader() {
  function handleProduct(event: React.MouseEvent<HTMLAnchorElement>) {
    if (window.location.pathname !== "/") return;
    event.preventDefault();
    if (stage() === "landing") {
      document.getElementById("product-check")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    window.dispatchEvent(new Event("veritas:start"));
  }

  function handleHowItWorks(event: React.MouseEvent<HTMLAnchorElement>) {
    if (window.location.pathname !== "/") return;
    const currentStage = stage();
    if (currentStage !== "landing" && currentStage !== "workspace") return;
    event.preventDefault();
    window.dispatchEvent(new Event("veritas:how-it-works"));
  }

  function handleStart(event: React.MouseEvent<HTMLAnchorElement>) {
    if (window.location.pathname !== "/") return;
    event.preventDefault();
    window.dispatchEvent(new Event("veritas:start"));
  }

  return (
    <header className="site-header sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-8 lg:px-12">
        <Link href="/" aria-label="Veritas home" className="inline-flex shrink-0 items-center gap-3 rounded-control text-ink">
          <Image src="/veritas-mark.png" alt="" aria-hidden width={36} height={36} priority className="size-9 shrink-0 rounded-full border border-line bg-white object-cover" />
          <span className="text-[15px] font-semibold tracking-[-0.035em]">Veritas</span>
        </Link>

        <nav aria-label="Main" className="flex min-w-0 items-center gap-0.5 sm:gap-1">
          <Link href="/#product-check" onClick={handleProduct} className="site-nav-link">Product</Link>
          <Link href="/#how-it-works" onClick={handleHowItWorks} className="site-nav-link">How it works</Link>
          <Link href="/about" className="site-nav-link hidden lg:inline-flex">Technical method</Link>
        </nav>

        <Link href="/" onClick={handleStart} className="site-header-cta inline-flex min-h-10 shrink-0 items-center gap-2 rounded-control px-3.5 text-xs font-semibold sm:px-4 sm:text-sm">
          <span className="hidden sm:inline">Start a review</span>
          <span className="sm:hidden">Start</span>
          <ArrowUpRight size={16} aria-hidden />
        </Link>
      </div>
    </header>
  );
}
