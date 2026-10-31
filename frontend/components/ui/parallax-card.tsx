"use client";

import React, { useRef, useState, useCallback, createContext, useContext } from "react";
import { cn } from "@/lib/utils";

interface ParallaxContextType {
  mouseX: number;
  mouseY: number;
  isHovered: boolean;
  sensitivity: number;
}

const ParallaxContext = createContext<ParallaxContextType>({
  mouseX: 0,
  mouseY: 0,
  isHovered: false,
  sensitivity: 1,
});

export interface ParallaxCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  maxTilt?: number;
  perspective?: number;
  mouseSensitivity?: number;
  enableDepthFog?: boolean;
  enableMagneticAttraction?: boolean;
}

export function ParallaxCard({
  children,
  className = "",
  glowColor = "rgba(56, 189, 248, 0.15)",
  maxTilt = 10,
  perspective = 1500,
  mouseSensitivity = 1.2,
  enableDepthFog = true,
  enableMagneticAttraction = true,
  ...props
}: ParallaxCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    x: number;
    y: number;
    rotateX: number;
    rotateY: number;
    glareX: number;
    glareY: number;
    magneticX: number;
    magneticY: number;
  }>({
    x: 0,
    y: 0,
    rotateX: 0,
    rotateY: 0,
    glareX: 50,
    glareY: 50,
    magneticX: 0,
    magneticY: 0,
  });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width;
      const normY = (e.clientY - rect.top) / rect.height;

      const rotateX = (0.5 - normY) * maxTilt * 2 * mouseSensitivity;
      const rotateY = (normX - 0.5) * maxTilt * 2 * mouseSensitivity;
      const glareX = normX * 100;
      const glareY = normY * 100;

      const magneticX = enableMagneticAttraction ? (normX - 0.5) * 8 : 0;
      const magneticY = enableMagneticAttraction ? (normY - 0.5) * 8 : 0;

      setCoords({
        x: (normX - 0.5) * 20 * mouseSensitivity,
        y: (normY - 0.5) * 20 * mouseSensitivity,
        rotateX,
        rotateY,
        glareX,
        glareY,
        magneticX,
        magneticY,
      });
    },
    [maxTilt, mouseSensitivity, enableMagneticAttraction]
  );

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setCoords({
      x: 0,
      y: 0,
      rotateX: 0,
      rotateY: 0,
      glareX: 50,
      glareY: 50,
      magneticX: 0,
      magneticY: 0,
    });
  }, []);

  return (
    <ParallaxContext.Provider
      value={{
        mouseX: coords.x,
        mouseY: coords.y,
        isHovered,
        sensitivity: mouseSensitivity,
      }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          perspective: `${perspective}px`,
        }}
        className={cn("group/parallax relative select-none will-change-transform", className)}
        {...props}
      >
        <div
          className="relative w-full h-full rounded-2xl border border-line bg-elev/60 p-6 transition-transform duration-200 ease-out overflow-hidden"
          style={{
            transformStyle: "preserve-3d",
            transform: isHovered
              ? `translate3d(${coords.magneticX}px, ${coords.magneticY}px, 0) rotateX(${coords.rotateX}deg) rotateY(${coords.rotateY}deg) scale3d(1.02, 1.02, 1.02)`
              : "translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
            boxShadow: isHovered
              ? `0 24px 48px -12px ${glowColor}, 0 0 24px -4px ${glowColor}`
              : "0 4px 15px rgba(0,0,0,0.4)",
          }}
        >
          {/* Depth Fog / Atmospheric Sheen */}
          {enableDepthFog && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 transition-opacity duration-300"
              style={{
                opacity: isHovered ? 0.35 : 0.05,
                background: `radial-gradient(ellipse at 50% 0%, ${glowColor}, transparent 75%)`,
              }}
            />
          )}

          {/* Specular Radial Glare Layer */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 transition-opacity duration-300"
            style={{
              opacity: isHovered ? 0.75 : 0,
              background: `radial-gradient(circle 380px at ${coords.glareX}% ${coords.glareY}%, rgba(255,255,255,0.08), transparent 70%)`,
            }}
          />

          {/* Ambient Glow Cushion */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-px transition-opacity duration-300"
            style={{
              opacity: isHovered ? 1 : 0,
              background: `radial-gradient(420px circle at ${coords.glareX}% ${coords.glareY}%, ${glowColor}, transparent 65%)`,
            }}
          />

          {/* Render Children with 3D Depth Context */}
          <div
            className="relative z-10 w-full h-full transition-transform duration-200 ease-out"
            style={{
              transformStyle: "preserve-3d",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </ParallaxContext.Provider>
  );
}

/**
 * ParallaxLayer: Allows specific nested content (badges, text, buttons)
 * to offset at distinct 3D depths (translateZ + XY parallax shift).
 */
export function ParallaxLayer({
  children,
  depth = 20,
  className = "",
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { depth?: number }) {
  const { mouseX, mouseY, isHovered } = useContext(ParallaxContext);

  const factor = depth / 25;
  const offsetX = isHovered ? mouseX * 0.35 * factor : 0;
  const offsetY = isHovered ? mouseY * 0.35 * factor : 0;

  return (
    <div
      className={cn("transition-transform duration-200 ease-out", className)}
      style={{
        transformStyle: "preserve-3d",
        transform: `translate3d(${offsetX}px, ${offsetY}px, ${isHovered ? depth : 0}px)`,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export default ParallaxCard;
