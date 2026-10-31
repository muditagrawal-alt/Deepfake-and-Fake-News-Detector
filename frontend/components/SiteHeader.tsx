"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "@phosphor-icons/react";
import { Menu, MenuItem, ProductItem, HoveredLink } from "@/components/ui/navbar-menu";
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
    <header className="site-header sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-8 lg:px-12">
        {/* Brand Shield & Tag */}
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
            className="site-brand-mark size-[37px] shrink-0 object-contain drop-shadow-[0_2px_12px_rgba(255,255,255,0.15)]"
          />
          <span className="text-[16px] font-semibold tracking-[-0.035em]">Veritas</span>
        </Link>

        {/* Aceternity Animated Navbar Menu for Desktop */}
        <div className="hidden md:block">
          <Menu
            setActive={setActive}
            className="border-line/70 bg-elev/70 backdrop-blur-md px-5 py-2 shadow-sm space-x-6"
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
        <nav aria-label="Main Mobile" className="hidden sm:flex md:hidden shrink-0 items-center gap-1">
          <Link href="/#product-check" onClick={handleProduct} className="site-nav-link text-xs">Product</Link>
          <Link href="/#architecture" onClick={handleArchitecture} className="site-nav-link text-xs">Topology</Link>
          <Link href="/#tech-stack" onClick={handleTechStack} className="site-nav-link text-xs">Stack</Link>
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
