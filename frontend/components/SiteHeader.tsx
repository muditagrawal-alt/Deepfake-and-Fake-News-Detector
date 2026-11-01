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
  const [isWorkspace, setIsWorkspace] = useState<boolean>(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const checkWorkspace = () => {
      if (typeof window === "undefined") return;
      const urlStage = new URLSearchParams(window.location.search).get("stage");
      const stored = sessionStorage.getItem("veritas_stage");
      const domStage = document.querySelector<HTMLElement>("[data-app-stage]")?.dataset.appStage;
      setIsWorkspace(urlStage === "workspace" || stored === "workspace" || domStage === "workspace");
    };

    checkWorkspace();
    window.addEventListener("veritas:stage-change", checkWorkspace);
    window.addEventListener("veritas:home", () => setIsWorkspace(false));
    window.addEventListener("veritas:start", () => {
      setTimeout(checkWorkspace, 50);
    });
    window.addEventListener("popstate", checkWorkspace);

    const observer = new MutationObserver(checkWorkspace);
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ["data-app-stage"] });

    return () => {
      window.removeEventListener("veritas:stage-change", checkWorkspace);
      window.removeEventListener("veritas:home", () => setIsWorkspace(false));
      window.removeEventListener("veritas:start", () => setTimeout(checkWorkspace, 50));
      window.removeEventListener("popstate", checkWorkspace);
      observer.disconnect();
    };
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

  function handleStart(event: React.MouseEvent<HTMLAnchorElement>) {
    if (window.location.pathname !== "/") return;
    event.preventDefault();
    window.dispatchEvent(new Event("veritas:start"));
  }

  if (isWorkspace) {
    return null;
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
          <span className="text-[14px] sm:text-[15px] font-semibold tracking-[-0.03em] text-white">Veritas</span>
        </Link>

        {/* Dynamic Island Nav Menu Items (Desktop) */}
        <div className="hidden md:block">
          <Menu
            setActive={setActive}
            className="bg-transparent border-none p-0 shadow-none space-x-6 lg:space-x-8"
          >
            {/* 1. Forensics / Detection Engines */}
            <MenuItem setActive={setActive} active={active} item="Forensics" href="/forensics">
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
            <MenuItem setActive={setActive} active={active} item="Pipeline" href="/pipeline">
              <div className="flex flex-col space-y-1.5 p-2 text-sm min-w-[280px]">
                <HoveredLink
                  href="/#product-check"
                  onClick={handleProduct}
                  description="Media ingestion, hash generation, and claim extraction."
                >
                  Direct Inspection Ingestion
                </HoveredLink>
                <HoveredLink
                  href="/pipeline"
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
            <MenuItem setActive={setActive} active={active} item="Architecture" href="/architecture">
              <div className="flex flex-col space-y-1.5 p-2 text-sm min-w-[300px]">
                <HoveredLink
                  href="/architecture"
                  description="Interactive 3D network topology rendered with Anime.js."
                >
                  3D System Architecture
                </HoveredLink>
                <HoveredLink
                  href="/tech-stack"
                  description="Dynamic production manifest with 3D Parallax cards."
                >
                  Production Tech Stack
                </HoveredLink>
              </div>
            </MenuItem>

            {/* 4. Methodology */}
            <MenuItem setActive={setActive} active={active} item="Methodology" href="/methodology">
              <div className="flex flex-col space-y-1.5 p-2 text-sm min-w-[280px]">
                <HoveredLink
                  href="/methodology"
                  description="Full architectural review of the multi-signal forensic approach."
                >
                  Technical Whitepaper
                </HoveredLink>
                <HoveredLink
                  href="/methodology#signals"
                  description="Taxonomy of spectral, metadata, and neural forensic models."
                >
                  Sensor Signal Directory
                </HoveredLink>
                <HoveredLink
                  href="/methodology#consensus"
                  description="Weighted Bayesian consensus scoring across independent sources."
                >
                  Consensus Triangulation
                </HoveredLink>
                <HoveredLink
                  href="/methodology#zero-persistence"
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
          <Link href="/forensics" className="hover:text-white px-1.5 py-0.5 rounded transition-colors">Forensics</Link>
          <Link href="/pipeline" className="hover:text-white px-1.5 py-0.5 rounded transition-colors">Pipeline</Link>
          <Link href="/architecture" className="hover:text-white px-1.5 py-0.5 rounded transition-colors">Architecture</Link>
          <Link href="/methodology" className="hover:text-white px-1.5 py-0.5 rounded transition-colors">Method</Link>
        </nav>

        {/* CTA Button */}
        <Link
          href="/"
          onClick={handleStart}
          className="inline-flex items-center gap-1.5 rounded-full bg-white text-black font-semibold px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm hover:bg-zinc-200 transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          <span>Get Started</span>
          <ArrowUpRight size={14} weight="bold" aria-hidden />
        </Link>
      </div>
    </header>
  );
}
