"use client";

import React, { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface ParallaxCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  maxTilt?: number;
  perspective?: number;
}

export function ParallaxCard({
  children,
  className = "",
  glowColor = "rgba(56, 189, 248, 0.15)",
  maxTilt = 12,
  perspective = 1000,
  ...props
}: ParallaxCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number; rotateX: number; rotateY: number; glareX: number; glareY: number }>({
    x: 0,
    y: 0,
    rotateX: 0,
    rotateY: 0,
    glareX: 50,
    glareY: 50,
  });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const rotateX = (0.5 - y) * maxTilt * 2;
      const rotateY = (x - 0.5) * maxTilt * 2;
      const glareX = x * 100;
      const glareY = y * 100;

      setCoords({ x: (x - 0.5) * 20, y: (y - 0.5) * 20, rotateX, rotateY, glareX, glareY });
    },
    [maxTilt]
  );

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setCoords({ x: 0, y: 0, rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: `${perspective}px`,
      }}
      className={cn("group/parallax relative rounded-2xl select-none", className)}
      {...props}
    >
      <div
        className="relative w-full h-full rounded-2xl border border-line bg-elev/60 p-6 transition-all duration-200 ease-out overflow-hidden"
        style={{
          transformStyle: "preserve-3d",
          transform: isHovered
            ? `rotateX(${coords.rotateX}deg) rotateY(${coords.rotateY}deg) scale3d(1.02, 1.02, 1.02)`
            : "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
          boxShadow: isHovered
            ? `0 20px 40px -15px ${glowColor}, 0 0 20px -5px ${glowColor}`
            : "0 4px 15px rgba(0,0,0,0.4)",
        }}
      >
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
            background: `radial-gradient(400px circle at ${coords.glareX}% ${coords.glareY}%, ${glowColor}, transparent 65%)`,
          }}
        />

        {/* Children content rendered with 3D depth */}
        <div
          className="relative z-10 w-full h-full transition-transform duration-200 ease-out"
          style={{
            transform: isHovered
              ? `translate3d(${coords.x * 0.4}px, ${coords.y * 0.4}px, 25px)`
              : "translate3d(0, 0, 0)",
            transformStyle: "preserve-3d",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default ParallaxCard;
