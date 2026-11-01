"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [activeSection, setActiveSection] = useState<string | null>(null);
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

  // Scroll spy to highlight active section as user scrolls through the page
  useEffect(() => {
    if (typeof window === "undefined") return;

    const sectionIds: Record<string, string> = {
      "parallax-evidence": "forensics",
      "pipeline": "pipeline",
      "architecture": "architecture",
      "how-it-works": "methodology",
    };

    const handleScrollSpy = () => {
      if (window.scrollY < 200) {
        setActiveSection(null);
        return;
      }

      const viewportCenter = window.scrollY + window.innerHeight * 0.35;
      let matchedKey: string | null = null;

      for (const [id, key] of Object.entries(sectionIds)) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (viewportCenter >= top && viewportCenter < top + height) {
            matchedKey = key;
            break;
          }
        }
      }

      if (matchedKey) {
        setActiveSection(matchedKey);
      }
    };

    window.addEventListener("scroll", handleScrollSpy, { passive: true });
    handleScrollSpy();
    return () => window.removeEventListener("scroll", handleScrollSpy);
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

  // In-page fast-forward scroll handler
  const scrollToSection = useCallback((targetId: string, sectionKey: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
    }
    setActive(null);
    setActiveSection(sectionKey);

    if (window.location.pathname !== "/") {
      window.location.href = `/#${targetId}`;
      return;
    }

    // If currently inside workspace, return home first
    window.dispatchEvent(new Event("veritas:home"));

    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Home logo click returns smoothly to top of landing page
  function handleHome(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    setActive(null);
    setActiveSection(null);

    if (window.location.pathname !== "/") {
      window.location.href = "/";
      return;
    }

    window.dispatchEvent(new Event("veritas:home"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleStart(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (window.location.pathname !== "/") {
      window.location.href = "/";
      return;
    }
    if (stage() === "landing") {
      scrollToSection("product-check", "forensics");
      return;
    }
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
        {/* Brand Shield & Title & Status Beacon — Returns back to top/home */}
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

        {/* Dynamic Island Nav Menu Items (Desktop) — In-page fast scrolling & Active highlight */}
        <div className="hidden md:block">
          <Menu
            setActive={setActive}
            className="bg-transparent border-none p-0 shadow-none space-x-2 lg:space-x-4"
          >
            {/* 1. Forensics / Detection Engines */}
            <MenuItem
              setActive={setActive}
              active={active}
              item="Forensics"
              href="/#parallax-evidence"
              isHighlighted={activeSection === "forensics"}
              onClick={(e) => scrollToSection("parallax-evidence", "forensics", e)}
            >
              <div className="grid grid-cols-2 gap-3 p-2 text-sm w-[580px]">
                <ProductItem
                  title="Claim Triangulation"
                  href="/#parallax-evidence"
                  visual={<TriangulationThumbnail />}
                  onClick={(e) => scrollToSection("parallax-evidence", "forensics", e)}
                  description="Cross-indexes disputed claims with Reuters, AP, and primary wire consensus."
                />
                <ProductItem
                  title="Spectral Voice Clone"
                  href="/#parallax-evidence"
                  visual={<AudioSpectrogramThumbnail />}
                  onClick={(e) => scrollToSection("parallax-evidence", "forensics", e)}
                  description="Mel-frequency pitch jitter, synthetic voice timbre, and phoneme latency audit."
                />
                <ProductItem
                  title="Micro-Saccade Vision"
                  href="/#parallax-evidence"
                  visual={<MicroSaccadeThumbnail />}
                  onClick={(e) => scrollToSection("parallax-evidence", "forensics", e)}
                  description="Pixel boundary blending, pupil micro-fixations, and facial landmark anomalies."
                />
                <ProductItem
                  title="C2PA Provenance"
                  href="/#parallax-evidence"
                  visual={<C2paThumbnail />}
                  onClick={(e) => scrollToSection("parallax-evidence", "forensics", e)}
                  description="Hardware sensor manifests, cryptographically bound signatures, and edit trails."
                />
              </div>
            </MenuItem>

            {/* 2. Verification Pipeline */}
            <MenuItem
              setActive={setActive}
              active={active}
              item="Pipeline"
              href="/#pipeline"
              isHighlighted={activeSection === "pipeline"}
              onClick={(e) => scrollToSection("pipeline", "pipeline", e)}
            >
              <div className="flex flex-col space-y-1.5 p-2 text-sm min-w-[280px]">
                <HoveredLink
                  href="/#product-check"
                  onClick={(e) => scrollToSection("product-check", "forensics", e)}
                  description="Media ingestion, hash generation, and claim extraction."
                >
                  Direct Inspection Ingestion
                </HoveredLink>
                <HoveredLink
                  href="/#pipeline"
                  onClick={(e) => scrollToSection("pipeline", "pipeline", e)}
                  description="Primary wire reporting indexation and consensus scoring."
                >
                  Three Pillars Verification Engine
                </HoveredLink>
                <HoveredLink
                  href="/#dossier"
                  onClick={(e) => scrollToSection("dossier", "pipeline", e)}
                  description="Chain-of-custody cryptographic inspection dossier."
                >
                  Investigative Case Dossiers
                </HoveredLink>
                <HoveredLink
                  href="/#interactive-demo"
                  onClick={(e) => scrollToSection("interactive-demo", "pipeline", e)}
                  description="Real-time multi-modal case study walkthrough."
                >
                  Interactive Forensic Demo
                </HoveredLink>
              </div>
            </MenuItem>

            {/* 3. Architecture & Tech Stack */}
            <MenuItem
              setActive={setActive}
              active={active}
              item="Architecture"
              href="/#architecture"
              isHighlighted={activeSection === "architecture"}
              onClick={(e) => scrollToSection("architecture", "architecture", e)}
            >
              <div className="flex flex-col space-y-1.5 p-2 text-sm min-w-[300px]">
                <HoveredLink
                  href="/#architecture"
                  onClick={(e) => scrollToSection("architecture", "architecture", e)}
                  description="Interactive 3D network topology rendered with Anime.js."
                >
                  3D System Architecture
                </HoveredLink>
                <HoveredLink
                  href="/#tech-stack"
                  onClick={(e) => scrollToSection("tech-stack", "architecture", e)}
                  description="Dynamic production manifest with 3D Parallax cards."
                >
                  Production Tech Stack
                </HoveredLink>
              </div>
            </MenuItem>

            {/* 4. Methodology */}
            <MenuItem
              setActive={setActive}
              active={active}
              item="Methodology"
              href="/#how-it-works"
              isHighlighted={activeSection === "methodology"}
              onClick={(e) => scrollToSection("how-it-works", "methodology", e)}
            >
              <div className="flex flex-col space-y-1.5 p-2 text-sm min-w-[280px]">
                <HoveredLink
                  href="/#how-it-works"
                  onClick={(e) => scrollToSection("how-it-works", "methodology", e)}
                  description="Word-by-word scroll scrubbing of the verification lifecycle."
                >
                  Verification Methodology
                </HoveredLink>
                <HoveredLink
                  href="/#benchmarks"
                  onClick={(e) => scrollToSection("benchmarks", "methodology", e)}
                  description="Academic ground truth benchmarks and empirical metrics."
                >
                  Benchmark Comparison
                </HoveredLink>
                <HoveredLink
                  href="/#feedback"
                  onClick={(e) => scrollToSection("feedback", "methodology", e)}
                  description="Send feedback or submit forensic audit requests."
                >
                  Feedback & Audit Inquiries
                </HoveredLink>
              </div>
            </MenuItem>
          </Menu>
        </div>

        {/* Streamlined Fallback for Mobile Viewports with in-page smooth navigation */}
        <nav aria-label="Main Mobile" className="flex md:hidden items-center gap-1 sm:gap-1.5 text-[11px] font-mono">
          <a
            href="/#parallax-evidence"
            onClick={(e) => scrollToSection("parallax-evidence", "forensics", e)}
            className={cn(
              "px-2 py-0.5 rounded-full transition-all",
              activeSection === "forensics"
                ? "text-white bg-white/20 ring-1 ring-cyan-400/40 font-semibold shadow-[0_0_8px_rgba(56,189,248,0.3)]"
                : "text-zinc-400 hover:text-white"
            )}
          >
            Forensics
          </a>
          <a
            href="/#pipeline"
            onClick={(e) => scrollToSection("pipeline", "pipeline", e)}
            className={cn(
              "px-2 py-0.5 rounded-full transition-all",
              activeSection === "pipeline"
                ? "text-white bg-white/20 ring-1 ring-cyan-400/40 font-semibold shadow-[0_0_8px_rgba(56,189,248,0.3)]"
                : "text-zinc-400 hover:text-white"
            )}
          >
            Pipeline
          </a>
          <a
            href="/#architecture"
            onClick={(e) => scrollToSection("architecture", "architecture", e)}
            className={cn(
              "px-2 py-0.5 rounded-full transition-all",
              activeSection === "architecture"
                ? "text-white bg-white/20 ring-1 ring-cyan-400/40 font-semibold shadow-[0_0_8px_rgba(56,189,248,0.3)]"
                : "text-zinc-400 hover:text-white"
            )}
          >
            Arch
          </a>
          <a
            href="/#how-it-works"
            onClick={(e) => scrollToSection("how-it-works", "methodology", e)}
            className={cn(
              "px-2 py-0.5 rounded-full transition-all",
              activeSection === "methodology"
                ? "text-white bg-white/20 ring-1 ring-cyan-400/40 font-semibold shadow-[0_0_8px_rgba(56,189,248,0.3)]"
                : "text-zinc-400 hover:text-white"
            )}
          >
            Method
          </a>
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
