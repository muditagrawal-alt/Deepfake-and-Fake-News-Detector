"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface ParallaxCardItem {
  id: string;
  name: string;
  category: string;
  version: string;
  role: string;
  description: string;
  metric: string;
  badge: string;
  spotlightColor: string;
  docsUrl: string;
}

export interface ParallaxCardsProps {
  items: ParallaxCardItem[];
  className?: string;
  perspective?: number;
  mouseSensitivity?: number;
  animationDuration?: number;
  enableDepthFog?: boolean;
  fogIntensity?: number;
  enableMagneticAttraction?: boolean;
  magneticStrength?: number;
}

export function ParallaxCards({
  items,
  className = "",
  perspective = 2500,
  mouseSensitivity = 2.4,
  animationDuration = 0.6,
  enableDepthFog = true,
  fogIntensity = 1,
  enableMagneticAttraction = true,
  magneticStrength = 40,
}: ParallaxCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0, normX: 0, normY: 0 });
  const [smoothCursor, setSmoothCursor] = useState({ x: 0, y: 0, normX: 0, normY: 0 });

  // Smooth lerp animation loop for fluid cursor trailing
  useEffect(() => {
    let animId: number;
    const lerp = () => {
      setSmoothCursor((prev) => {
        const factor = 0.14;
        return {
          x: prev.x + (cursor.x - prev.x) * factor,
          y: prev.y + (cursor.y - prev.y) * factor,
          normX: prev.normX + (cursor.normX - prev.normX) * factor,
          normY: prev.normY + (cursor.normY - prev.normY) * factor,
        };
      });
      animId = requestAnimationFrame(lerp);
    };
    animId = requestAnimationFrame(lerp);
    return () => cancelAnimationFrame(animId);
  }, [cursor]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const normX = (x / rect.width) * 2 - 1; // -1 to 1
    const normY = (y / rect.height) * 2 - 1; // -1 to 1

    setCursor({ x, y, normX, normY });
  }, []);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setCursor({ x: 0, y: 0, normX: 0, normY: 0 });
  }, []);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  }, [items.length]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  }, [items.length]);

  // Handle keyboard arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrev, handleNext]);

  if (!items || items.length === 0) return null;

  const currentItem = items[activeIndex] || items[0];

  return (
    <div className={cn("w-full space-y-6 select-none", className)}>
      {/* 3D Stage Viewport */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          perspective: `${perspective}px`,
        }}
        className="relative w-full h-[520px] sm:h-[560px] flex items-center justify-center overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-elev/80 via-elev/40 to-elev/80"
      >
        {/* Background coordinate grid */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Dynamic Ambient Stage Glow based on Active Item Color */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-opacity duration-700"
          style={{
            background: `radial-gradient(circle 550px at ${50 + smoothCursor.normX * 25}% ${
              50 + smoothCursor.normY * 25
            }%, ${currentItem.spotlightColor}, transparent 70%)`,
            opacity: isHovered ? 0.95 : 0.45,
          }}
        />

        {/* 3D Parallax Stack Container */}
        <div
          className="relative w-[310px] sm:w-[420px] md:w-[480px] h-[340px] sm:h-[360px]"
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateY(${smoothCursor.normX * 10 * mouseSensitivity}deg) rotateX(${
              -smoothCursor.normY * 10 * mouseSensitivity
            }deg)`,
            transition: isHovered ? "none" : `transform ${animationDuration}s cubic-bezier(0.2, 0.8, 0.2, 1)`,
          }}
        >
          {items.map((item, idx) => {
            // Calculate wrapped distance from active card (-2, -1, 0, 1, 2)
            let diff = idx - activeIndex;
            if (diff > items.length / 2) diff -= items.length;
            if (diff < -items.length / 2) diff += items.length;

            const absDiff = Math.abs(diff);
            // Show up to 2 cards on each side in 3D fanned deck
            if (absDiff > 2) return null;

            const isFront = diff === 0;

            // 3D positioning metrics for fanned deck
            const xSpread = diff * 125; // Horizontal separation
            const zDistance = -absDiff * 140; // Depth into space
            const yOffset = absDiff * 14; // Slight vertical curve
            const rotZ = diff * 3.5; // Slight rotation fan
            const rotY = diff * -4; // Face slightly toward center

            // Magnetic attraction on mouse move
            const xMagnetic = enableMagneticAttraction
              ? smoothCursor.normX * (magneticStrength / (1 + absDiff * 0.7))
              : 0;
            const yMagnetic = enableMagneticAttraction
              ? smoothCursor.normY * (magneticStrength / (1 + absDiff * 0.7))
              : 0;

            const scale = Math.max(0.78, 1 - absDiff * 0.08);
            const blurAmount = enableDepthFog && !isFront ? absDiff * 2.2 * fogIntensity : 0;
            const opacity = isFront ? 1 : Math.max(0.35, 1 - absDiff * 0.28);

            return (
              <div
                key={item.id}
                onClick={() => setActiveIndex(idx)}
                style={{
                  position: "absolute",
                  inset: 0,
                  transformStyle: "preserve-3d",
                  transform: `translate3d(${xSpread + xMagnetic}px, ${yOffset + yMagnetic}px, ${zDistance}px) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${scale})`,
                  opacity,
                  filter: blurAmount > 0 ? `blur(${blurAmount}px)` : undefined,
                  zIndex: 20 - absDiff,
                  transition: `transform ${animationDuration}s cubic-bezier(0.2, 0.8, 0.2, 1), opacity ${animationDuration}s ease, filter ${animationDuration}s ease`,
                  cursor: isFront ? "default" : "pointer",
                }}
                className={cn(
                  "rounded-2xl border p-6 sm:p-7 flex flex-col justify-between shadow-2xl transition-colors will-change-transform",
                  isFront
                    ? "bg-elev border-line-strong shadow-[0_30px_70px_-15px_rgba(0,0,0,0.85)]"
                    : "bg-elev/85 border-line hover:border-line-strong hover:bg-elev"
                )}
              >
                {/* Specular Radial Glare Reflection on Front Card */}
                {isFront && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden transition-opacity duration-300"
                    style={{
                      background: `radial-gradient(circle 380px at ${(smoothCursor.normX + 1) * 50}% ${
                        (smoothCursor.normY + 1) * 50
                      }%, rgba(255, 255, 255, 0.12), transparent 70%)`,
                      opacity: isHovered ? 1 : 0,
                    }}
                  />
                )}

                {/* Card Top: Badges & Version */}
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono tracking-wider px-2.5 py-1 rounded bg-line/60 border border-line text-ink-2">
                      {item.badge}
                    </span>
                    <span className="text-xs font-mono text-ink-3">{item.version}</span>
                  </div>

                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center justify-between">
                      <span>{item.name}</span>
                      {isFront && item.docsUrl && (
                        <a
                          href={item.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Official documentation for ${item.name}`}
                          className="text-xs font-mono text-ink-3 hover:text-white px-2.5 py-1 rounded bg-elev border border-line hover:border-line-strong transition-all inline-flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>Docs</span>
                          <span aria-hidden="true">&nearr;</span>
                        </a>
                      )}
                    </h3>
                    <div className="text-xs sm:text-sm font-mono text-accent mt-1 flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-real" />
                      <span>{item.role}</span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-ink-2 leading-relaxed line-clamp-3 sm:line-clamp-none">
                    {item.description}
                  </p>
                </div>

                {/* Card Bottom: Telemetry Metric & Category Indicator */}
                <div className="pt-4 mt-4 border-t border-line/60 flex items-center justify-between text-xs font-mono relative z-10">
                  <div className="flex items-center gap-1.5 text-ink">
                    <span className="size-1.5 rounded-full bg-real animate-pulse" />
                    <span>{item.metric}</span>
                  </div>
                  <span className="text-ink-3 uppercase text-[10px] tracking-wider">
                    {item.category}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stack Navigation Overlay Controls */}
        <div className="absolute bottom-5 inset-x-6 flex items-center justify-between pointer-events-none">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous tech card in 3D stack"
            className="pointer-events-auto px-4 py-2 rounded-control bg-elev/90 border border-line hover:border-line-strong text-ink-2 hover:text-white text-xs font-mono transition-all backdrop-blur-md cursor-pointer flex items-center gap-1.5"
          >
            <span aria-hidden="true">&larr;</span>
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* Stepper Dots */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIndex(i)}
                aria-label={`Jump to tech card ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all cursor-pointer",
                  activeIndex === i ? "w-6 bg-white" : "w-1.5 bg-line-strong hover:bg-ink-3"
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Next tech card in 3D stack"
            className="pointer-events-auto px-4 py-2 rounded-control bg-elev/90 border border-line hover:border-line-strong text-ink-2 hover:text-white text-xs font-mono transition-all backdrop-blur-md cursor-pointer flex items-center gap-1.5"
          >
            <span className="hidden sm:inline">Next</span>
            <span aria-hidden="true">&rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ParallaxCards;
