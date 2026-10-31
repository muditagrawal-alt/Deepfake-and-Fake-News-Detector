"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "@phosphor-icons/react";
import { Menu, MenuItem, ProductItem, HoveredLink } from "@/components/ui/navbar-menu";

function stage() {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>("[data-app-stage]")?.dataset.appStage;
}

export default function SiteHeader() {
  const [active, setActive] = useState<string | null>(null);

  function handleHome(event: React.MouseEvent<HTMLAnchorElement>) {
    if (window.location.pathname !== "/") return;
    event.preventDefault();
    window.dispatchEvent(new Event("veritas:home"));
  }

  function handleProduct(event: React.MouseEvent<HTMLAnchorElement>) {
    if (window.location.pathname !== "/") return;
    event.preventDefault();
    if (stage() === "landing") {
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      document.getElementById("product-check")?.scrollIntoView({ behavior, block: "center" });
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
        <Link
          href="/"
          onClick={handleHome}
          aria-label="Veritas home"
          className="inline-flex shrink-0 items-center gap-3 rounded-control text-ink hover:opacity-90 transition-opacity"
        >
          <Image
            src="/veritas-mark.png"
            alt="Veritas shield"
            aria-hidden
            width={38}
            height={39}
            priority
            className="site-brand-mark size-[37px] shrink-0 object-contain drop-shadow-[0_2px_10px_rgba(255,255,255,0.12)]"
          />
          <span className="text-[15px] font-semibold tracking-[-0.035em]">Veritas</span>
        </Link>

        {/* Aceternity Animated Navbar Menu for Desktop */}
        <div className="hidden md:block">
          <Menu
            setActive={setActive}
            className="border-line/70 bg-elev/70 backdrop-blur-md px-5 py-2 shadow-sm space-x-6"
          >
            <MenuItem setActive={setActive} active={active} item="Platform">
              <div className="grid grid-cols-2 gap-4 p-2 text-sm w-[540px]">
                <ProductItem
                  title="Multi-Modal Triangulation"
                  href="/#product-check"
                  src="https://assets.aceternity.com/demos/algochurn.webp"
                  description="Cross-verifies claims against primary sources and real-time news."
                />
                <ProductItem
                  title="Acoustic Voice Forensics"
                  href="/#product-check"
                  src="https://assets.aceternity.com/demos/tailwindmasterkit.webp"
                  description="Acoustic spectral clone detection and phoneme alignment analysis."
                />
                <ProductItem
                  title="Micro-Saccade Vision"
                  href="/#product-check"
                  src="/images/landing/phone.jpg"
                  description="Audits synthetic face borders, diffusion noise, and gaze jitters."
                />
                <ProductItem
                  title="C2PA Provenance Ledger"
                  href="/#product-check"
                  src="/images/landing/newspaper.jpg"
                  description="Hardware sensor manifests and cryptographic tamper seals."
                />
              </div>
            </MenuItem>
            <MenuItem setActive={setActive} active={active} item="Verification">
              <div className="flex flex-col space-y-2 p-1 text-sm min-w-[210px]">
                <HoveredLink href="/#product-check" onClick={handleProduct}>Direct Media Upload</HoveredLink>
                <HoveredLink href="/#pipeline" onClick={handleHowItWorks}>Four-Stage Pipeline</HoveredLink>
                <HoveredLink href="/#case-notes">Case Dossiers</HoveredLink>
                <HoveredLink href="/#parallax-evidence">Live Evidence Stream</HoveredLink>
              </div>
            </MenuItem>
            <MenuItem setActive={setActive} active={active} item="Methodology">
              <div className="flex flex-col space-y-2 p-1 text-sm min-w-[210px]">
                <HoveredLink href="/about">Technical Whitepaper</HoveredLink>
                <HoveredLink href="/about#signals">Forensic Signals</HoveredLink>
                <HoveredLink href="/about#consensus">Consensus Scoring</HoveredLink>
                <HoveredLink href="/about#zero-persistence">Zero Persistence</HoveredLink>
              </div>
            </MenuItem>
          </Menu>
        </div>

        {/* Streamlined Fallback for Mobile Viewports */}
        <nav aria-label="Main Mobile" className="hidden sm:flex md:hidden shrink-0 items-center gap-1">
          <Link href="/#product-check" onClick={handleProduct} className="site-nav-link text-xs">Product</Link>
          <Link href="/#how-it-works" onClick={handleHowItWorks} className="site-nav-link text-xs">How it works</Link>
          <Link href="/about" className="site-nav-link text-xs">Method</Link>
        </nav>

        <Link
          href="/"
          onClick={handleStart}
          className="site-header-cta inline-flex min-h-10 shrink-0 items-center gap-2 rounded-control px-3.5 text-xs font-semibold sm:px-4 sm:text-sm"
        >
          <span className="hidden sm:inline">Start a review</span>
          <span className="sm:hidden">Start</span>
          <ArrowUpRight size={16} aria-hidden />
        </Link>
      </div>
    </header>
  );
}
