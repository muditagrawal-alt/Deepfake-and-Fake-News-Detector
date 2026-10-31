"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "@phosphor-icons/react";
import { Menu, MenuItem, ProductItem, HoveredLink } from "@/components/ui/navbar-menu";
import { cn } from "@/lib/utils";
import {
  TriangulationThumbnail,
  AudioSpectrogramThumbnail,
  MicroSaccadeThumbnail,
  C2paThumbnail,
} from "@/components/ForensicThumbnails";

function stage() {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>("[data-app-stage]")?.dataset.appStage;
}

export default function SiteHeader() {
  const [active, setActive] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState<boolean>(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  function handleArchitecture(event: React.MouseEvent<HTMLAnchorElement>) {
    if (window.location.pathname !== "/") return;
    const target = document.getElementById("architecture");
    if (target) {
      event.preventDefault();
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      target.scrollIntoView({ behavior, block: "start" });
    }
  }

  function handleTechStack(event: React.MouseEvent<HTMLAnchorElement>) {
    if (window.location.pathname !== "/") return;
    const target = document.getElementById("tech-stack");
    if (target) {
      event.preventDefault();
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      target.scrollIntoView({ behavior, block: "start" });
    }
  }

  return (
    <header className="site-header fixed top-3 sm:top-5 inset-x-0 z-50 flex justify-center pointer-events-none px-3 sm:px-6">
      <div
        className={cn(
          "pointer-events-auto flex items-center justify-between gap-3 sm:gap-6 rounded-full",
          "bg-[#07080d]/85 dark:bg-[#07080d]/90 backdrop-blur-2xl border border-white/15",
          "shadow-[0_16px_50px_rgba(0,0,0,0.85),0_0_24px_rgba(56,189,248,0.12)]",
          "hover:border-cyan-500/40 hover:shadow-[0_18px_60px_rgba(56,189,248,0.22)]",
          "transition-all duration-300 ease-out select-none",
          scrolled
            ? "py-1.5 sm:py-2 px-3 sm:px-5 bg-[#050608]/95 border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.95)]"
            : "py-2 sm:py-2.5 px-3.5 sm:px-6"
        )}
      >
        {/* Brand Shield & Title & Status Beacon */}
        <Link
          href="/"
          onClick={handleHome}
          aria-label="Veritas home"
          className="inline-flex shrink-0 items-center gap-2.5 rounded-full text-white hover:opacity-90 transition-opacity pl-1"
        >
          <Image
            src="/veritas-mark.png"
            alt="Veritas shield"
            aria-hidden
            width={28}
            height={29}
            priority
            className="size-[26px] sm:size-[28px] shrink-0 object-contain drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]"
          />
          <div className="flex items-center gap-2">
            <span className="text-[14px] sm:text-[15px] font-semibold tracking-[-0.03em] text-white">Veritas</span>
            <span className="relative flex size-2 shrink-0" title="Veritas Engine: Live & Operational">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            </span>
          </div>
        </Link>

        {/* Dynamic Island Nav Menu Items (Desktop) */}
        <div className="hidden md:block">
          <Menu
            setActive={setActive}
            className="bg-transparent border-none p-0 shadow-none space-x-6 lg:space-x-8"
          >
            {/* 1. Forensics / Detection Engines */}
            <MenuItem setActive={setActive} active={active} item="Forensics">
              <div className="grid grid-cols-2 gap-3 p-2 text-sm w-[580px]">
                <ProductItem
                  title="Claim Triangulation"
                  href="/#product-check"
                  visual={<TriangulationThumbnail />}
                  description="Cross-indexes disputed claims with Reuters, AP, and primary wire consensus."
                />
                <ProductItem
                  title="Spectral Voice Clone"
                  href="/#product-check"
                  visual={<AudioSpectrogramThumbnail />}
                  description="Mel-frequency pitch jitter, synthetic voice timbre, and phoneme latency audit."
                />
                <ProductItem
                  title="Micro-Saccade Vision"
                  href="/#product-check"
                  visual={<MicroSaccadeThumbnail />}
                  description="Pixel boundary blending, pupil micro-fixations, and facial landmark anomalies."
                />
                <ProductItem
                  title="C2PA Provenance"
                  href="/#product-check"
                  visual={<C2paThumbnail />}
                  description="Hardware sensor manifests, cryptographically bound signatures, and edit trails."
                />
              </div>
            </MenuItem>

            {/* 2. Verification Pipeline */}
            <MenuItem setActive={setActive} active={active} item="Pipeline">
              <div className="flex flex-col space-y-1.5 p-2 text-sm min-w-[280px]">
                <HoveredLink
                  href="/#product-check"
                  onClick={handleProduct}
                  description="Media ingestion, hash generation, and claim extraction."
                >
                  Direct Inspection Ingestion
                </HoveredLink>
                <HoveredLink
                  href="/#pipeline"
                  onClick={handleHowItWorks}
                  description="Primary wire reporting indexation and consensus scoring."
                >
                  Four-Stage Provenance Pipeline
                </HoveredLink>
                <HoveredLink
                  href="/#case-notes"
                  description="Audited deepfakes and manipulated reporting breakdowns."
                >
                  Investigative Case Dossiers
                </HoveredLink>
                <HoveredLink
                  href="/#parallax-evidence"
                  description="Real-time sensor signals, EXIF data, and telemetry stream."
                >
                  Forensic Evidence Stream
                </HoveredLink>
              </div>
            </MenuItem>

            {/* 3. Architecture & Tech Stack */}
            <MenuItem setActive={setActive} active={active} item="Architecture">
              <div className="flex flex-col space-y-1.5 p-2 text-sm min-w-[300px]">
                <HoveredLink
                  href="/#architecture"
                  onClick={handleArchitecture}
                  description="Interactive 3D network topology rendered with Anime.js."
                >
                  3D System Architecture
                </HoveredLink>
                <HoveredLink
                  href="/#tech-stack"
                  onClick={handleTechStack}
                  description="Dynamic production manifest with 3D Parallax cards."
                >
                  Production Tech Stack
                </HoveredLink>
              </div>
            </MenuItem>

            {/* 4. Methodology */}
            <MenuItem setActive={setActive} active={active} item="Methodology">
              <div className="flex flex-col space-y-1.5 p-2 text-sm min-w-[280px]">
                <HoveredLink
                  href="/about"
                  description="Full architectural review of the multi-signal forensic approach."
                >
                  Technical Whitepaper
                </HoveredLink>
                <HoveredLink
                  href="/about#signals"
                  description="Taxonomy of spectral, metadata, and neural forensic models."
                >
                  Sensor Signal Directory
                </HoveredLink>
                <HoveredLink
                  href="/about#consensus"
                  description="Weighted Bayesian consensus scoring across independent sources."
                >
                  Consensus Triangulation
                </HoveredLink>
                <HoveredLink
                  href="/about#zero-persistence"
                  description="Zero media retention: inputs are purged immediately upon review."
                >
                  Zero-Persistence Privacy
                </HoveredLink>
              </div>
            </MenuItem>
          </Menu>
        </div>

        {/* Streamlined Fallback for Mobile Viewports */}
        <nav aria-label="Main Mobile" className="flex md:hidden items-center gap-1.5 sm:gap-2 text-[11px] font-mono text-zinc-400">
          <Link href="/#product-check" onClick={handleProduct} className="hover:text-white px-1.5 py-0.5 rounded transition-colors">Product</Link>
          <Link href="/#architecture" onClick={handleArchitecture} className="hover:text-white px-1.5 py-0.5 rounded transition-colors">Topology</Link>
          <Link href="/#tech-stack" onClick={handleTechStack} className="hover:text-white px-1.5 py-0.5 rounded transition-colors">Stack</Link>
        </nav>

        {/* CTA Button */}
        <Link
          href="/"
          onClick={handleStart}
          className="inline-flex items-center gap-1.5 rounded-full bg-white text-black font-semibold px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm hover:bg-zinc-200 transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          <span className="hidden sm:inline">Start a review</span>
          <span className="sm:hidden">Start</span>
          <ArrowUpRight size={14} weight="bold" aria-hidden />
        </Link>
      </div>
    </header>
  );
}
