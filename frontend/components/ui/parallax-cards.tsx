"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
  cardWidth?: number;
  cardHeight?: number;
  animationDuration?: number;
  enableDepthFog?: boolean;
  fogIntensity?: number;
  enableMagneticAttraction?: boolean;
  magneticStrength?: number;
  onCardClick?: (index: number, item: ParallaxCardItem) => void;
}

// 14 distinct 3D field coordinates: compressed depth and balanced scale for maximum legibility
const CARD_LAYOUT_PRESETS = [
  { x: -280, y: -110, z: -40, rotY: 5, rotX: -3, scale: 0.96, zIndex: 140 },
  { x: 280, y: -120, z: -80, rotY: -5, rotX: -3, scale: 0.94, zIndex: 130 },
  { x: -380, y: 140, z: -120, rotY: 6, rotX: 3, scale: 0.92, zIndex: 120 },
  { x: 380, y: 150, z: -160, rotY: -6, rotX: 3, scale: 0.90, zIndex: 110 },
  { x: -150, y: -235, z: -200, rotY: 2, rotX: -5, scale: 0.88, zIndex: 100 },
  { x: 150, y: -235, z: -220, rotY: -2, rotX: -5, scale: 0.87, zIndex: 95 },
  { x: -490, y: 15, z: -250, rotY: 9, rotX: 0, scale: 0.85, zIndex: 90 },
  { x: 490, y: 15, z: -270, rotY: -9, rotX: 0, scale: 0.84, zIndex: 85 },
  { x: -150, y: 240, z: -300, rotY: 2, rotX: 5, scale: 0.83, zIndex: 80 },
  { x: 150, y: 240, z: -320, rotY: -2, rotX: 5, scale: 0.82, zIndex: 75 },
  { x: -330, y: -175, z: -350, rotY: 5, rotX: -3, scale: 0.81, zIndex: 70 },
  { x: 330, y: -175, z: -370, rotY: -5, rotX: -3, scale: 0.80, zIndex: 65 },
  { x: -330, y: 175, z: -390, rotY: 5, rotX: 3, scale: 0.79, zIndex: 60 },
  { x: 330, y: 175, z: -410, rotY: -5, rotX: 3, scale: 0.78, zIndex: 55 },
];

export function ParallaxCards({
  items,
  className = "",
  perspective = 2500,
  mouseSensitivity = 3.0,
  cardWidth = 420,
  cardHeight = 320,
  animationDuration = 0.8,
  enableDepthFog = true,
  fogIntensity = 1,
  enableMagneticAttraction = true,
  magneticStrength = 50,
  onCardClick,
}: ParallaxCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [cursor, setCursor] = useState({ normX: 0, normY: 0 });
  const [smoothCursor, setSmoothCursor] = useState({ normX: 0, normY: 0 });

  // Fluid interpolation for cursor tracking
  useEffect(() => {
    let animId: number;
    const lerp = () => {
      setSmoothCursor((prev) => {
        const factor = 0.12;
        return {
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
    const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1; // -1 to 1
    const normY = ((e.clientY - rect.top) / rect.height) * 2 - 1; // -1 to 1

    setCursor({ normX, normY });
  }, []);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setCursor({ normX: 0, normY: 0 });
  }, []);

  const activeIndex = useMemo(() => {
    if (!selectedCardId) return -1;
    return items.findIndex((it) => it.id === selectedCardId);
  }, [selectedCardId, items]);

  if (!items || items.length === 0) return null;

  return (
    <div className={cn("w-full relative select-none", className)}>
      {/* Expansive 3D Stage Viewport (min 720px tall to accommodate full 3D depth field) */}
      <div
        ref={containerRef}
        onClick={() => setSelectedCardId(null)}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          perspective: `${perspective}px`,
        }}
        className="relative w-full h-[680px] sm:h-[720px] lg:h-[760px] flex items-center justify-center overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-elev/80 via-elev/40 to-elev/80"
      >
        {/* Stage background coordinate blueprint grid */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />

        {/* Ambient Stage Glow following cursor */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-opacity duration-700"
          style={{
            background: `radial-gradient(circle 600px at ${50 + smoothCursor.normX * 25}% ${
              50 + smoothCursor.normY * 25
            }%, rgba(56, 189, 248, 0.12), transparent 70%)`,
            opacity: isHovered ? 1 : 0.4,
          }}
        />

        {/* 3D Master Parallax Stage */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            transformStyle: "preserve-3d",
            transform: `translate3d(0px, 0px, 0px) rotateY(${
              smoothCursor.normX * 4 * mouseSensitivity
            }deg) rotateX(${-smoothCursor.normY * 4 * mouseSensitivity}deg)`,
            transition: isHovered
              ? "none"
              : `transform ${animationDuration}s cubic-bezier(0.2, 0.8, 0.2, 1)`,
          }}
        >
          {items.map((item, idx) => {
            const isSelected = activeIndex === idx;
            const layout = CARD_LAYOUT_PRESETS[idx % CARD_LAYOUT_PRESETS.length];

            // Base 3D coordinates from layout presets
            let posX = layout.x;
            let posY = layout.y;
            let posZ = layout.z;
            let rotX = layout.rotX;
            let rotY = layout.rotY;
            let scale = layout.scale;
            let zIndex = layout.zIndex;
            let opacity = 1;
            let blur = 0; // Keep all cards crisp and legible with zero muddy blur

            if (isSelected) {
              // Focused card glides smoothly forward into prominent center stage
              posX = 0;
              posY = 0;
              posZ = 160;
              rotX = 0;
              rotY = 0;
              scale = 1.04;
              zIndex = 800;
              opacity = 1;
              blur = 0;
            } else if (activeIndex !== -1) {
              // Cards behind/around the enlarged card part sideways to left and right wings
              // so there is ZERO obstruction of any card's content or buttons!
              const partDistance = 220;
              if (layout.x <= 0) {
                // Part to the left flank with ample clearance
                posX = Math.min(layout.x - partDistance, -380);
                rotY = 12; // Fanned inward towards center spotlight
              } else {
                // Part to the right flank with ample clearance
                posX = Math.max(layout.x + partDistance, 380);
                rotY = -12; // Fanned inward towards center spotlight
              }
              posY = layout.y * 0.85;
              posZ = Math.min(layout.z, -50);
              rotX = layout.rotX * 0.4;
              scale = Math.max(layout.scale * 0.94, 0.78);
              zIndex = layout.zIndex;
              // Remain crisp, clear, and prominently readable so the user can easily inspect and click them!
              opacity = 0.94;
              blur = 0;
            } else {
              // Standard 3D scattered layout with cursor parallax offset
              const depthFactor = (800 + posZ) / 800;
              const parallaxX = enableMagneticAttraction
                ? smoothCursor.normX * magneticStrength * (1.1 - depthFactor * 0.6)
                : 0;
              const parallaxY = enableMagneticAttraction
                ? smoothCursor.normY * magneticStrength * (1.1 - depthFactor * 0.6)
                : 0;
              posX += parallaxX;
              posY += parallaxY;

              // Crisp depth falloff without muddy blur
              const depthRatio = Math.abs(posZ) / 800;
              opacity = enableDepthFog
                ? Math.max(0.80, 1 - depthRatio * 0.25 * fogIntensity)
                : 1.0;
              blur = 0;
            }

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCardId(isSelected ? null : item.id);
                  if (onCardClick) onCardClick(idx, item);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedCardId(isSelected ? null : item.id);
                    if (onCardClick) onCardClick(idx, item);
                  }
                }}
                aria-label={`Inspect ${item.name}`}
                style={{
                  width: `min(${cardWidth}px, 86vw)`,
                  height: `${cardHeight}px`,
                  position: "absolute",
                  transformStyle: "preserve-3d",
                  transform: `translate3d(${posX}px, ${posY}px, ${posZ}px) rotateY(${rotY}deg) rotateX(${rotX}deg) scale(${scale})`,
                  opacity,
                  filter: blur > 0 ? `blur(${blur}px)` : undefined,
                  zIndex,
                  pointerEvents: "auto",
                  transition: `transform ${animationDuration}s cubic-bezier(0.2, 0.8, 0.2, 1), opacity ${animationDuration}s ease, filter ${animationDuration}s ease`,
                }}
                className={cn(
                  "rounded-2xl border p-6 flex flex-col justify-between shadow-2xl transition-colors cursor-pointer group will-change-transform",
                  isSelected
                    ? "bg-elev border-white shadow-[0_30px_90px_-15px_rgba(0,0,0,0.95)] ring-2 ring-cyan-400/40"
                    : "bg-elev/90 border-line hover:border-cyan-400/70 hover:bg-elev hover:shadow-[0_20px_50px_-10px_rgba(56,189,248,0.25)] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7)]"
                )}
              >
                {/* Specular Radial Glare Reflection */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden transition-opacity duration-300"
                  style={{
                    background: `radial-gradient(circle 380px at ${(smoothCursor.normX + 1) * 50}% ${
                      (smoothCursor.normY + 1) * 50
                    }%, rgba(255, 255, 255, 0.12), transparent 70%)`,
                    opacity: isHovered || isSelected ? 1 : 0,
                  }}
                />

                {/* Ambient Card Radial Gradient Tint */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-px rounded-2xl transition-opacity duration-500"
                  style={{
                    background: `radial-gradient(ellipse at 50% 0%, ${item.spotlightColor}, transparent 75%)`,
                    opacity: isSelected ? 1 : 0.45,
                  }}
                />

                {/* Card Top: Badges & Version */}
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono tracking-wider px-2.5 py-1 rounded bg-line/60 border border-line text-ink-2">
                      {item.badge}
                    </span>
                    <span className="text-xs font-mono text-ink-3">{item.version}</span>
                  </div>

                  <div>
                    <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-accent transition-colors flex items-center justify-between">
                      <span>{item.name}</span>
                      {item.docsUrl && (
                        <a
                          href={item.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Official documentation for ${item.name}`}
                          className="text-xs font-mono text-ink-3 hover:text-white px-2 py-0.5 rounded bg-line/40 hover:bg-line transition-all inline-flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>Docs</span>
                          <span aria-hidden="true">&nearr;</span>
                        </a>
                      )}
                    </h3>
                    <div className="text-xs font-mono text-accent mt-1 flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-real" />
                      <span>{item.role}</span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-ink-2 leading-relaxed line-clamp-3">
                    {item.description}
                  </p>
                </div>

                {/* Card Bottom: Metric & Category Indicator */}
                <div className="pt-4 mt-3 border-t border-line/60 flex items-center justify-between text-xs font-mono relative z-10">
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

        {/* Overlay Instructions & Stage Hint */}
        <div className="absolute bottom-5 inset-x-6 flex items-center justify-between text-xs font-mono text-ink-3 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-accent animate-ping" />
            <span>MOVE CURSOR TO SHIFT 3D PERSPECTIVE DEPTH</span>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            {selectedCardId && (
              <button
                type="button"
                onClick={() => setSelectedCardId(null)}
                className="pointer-events-auto px-3 py-1 rounded bg-elev border border-line hover:border-line-strong text-ink text-xs transition-colors cursor-pointer"
              >
                Reset Focus
              </button>
            )}
            <span>CLICK ANY CARD TO FOCUS FOREGROUND</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ParallaxCards;
