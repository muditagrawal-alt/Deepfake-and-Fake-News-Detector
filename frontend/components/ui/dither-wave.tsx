"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface DitherWaveProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: string;
  backgroundColor?: string;
  speed?: number;
  frequency?: number;
  amplitude?: number;
  ditherSize?: number;
  className?: string;
  mouseInteractive?: boolean;
}

// 4x4 Bayer Dithering Matrix in normalized 0.0 - 1.0 range
const BAYER_4X4 = [
  0 / 16, 8 / 16, 2 / 16, 10 / 16,
  12 / 16, 4 / 16, 14 / 16, 6 / 16,
  3 / 16, 11 / 16, 1 / 16, 9 / 16,
  15 / 16, 7 / 16, 13 / 16, 5 / 16,
];

function hexToRgb(hex: string): [number, number, number] {
  let c = hex.replace("#", "").trim();
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const num = parseInt(c, 16);
  if (isNaN(num)) return [59, 130, 246];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function DitherWave({
  color = "#38bdf8",
  backgroundColor = "#040406",
  speed = 1.0,
  frequency = 0.018,
  amplitude = 36.0,
  ditherSize = 3,
  className = "",
  mouseInteractive = true,
  children,
  ...props
}: DitherWaveProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5, active: false });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!mouseInteractive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.targetX = (e.clientX - rect.left) / rect.width;
    mouseRef.current.targetY = (e.clientY - rect.top) / rect.height;
    mouseRef.current.active = true;
  }, [mouseInteractive]);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current.active = false;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;

    const waveRgb = hexToRgb(color);
    const bgRgb = hexToRgb(backgroundColor);

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      width = Math.floor(rect.width);
      height = Math.floor(rect.height);
      canvas.width = width;
      canvas.height = height;
    };

    resize();
    window.addEventListener("resize", resize);

    const startTime = performance.now();

    const draw = (now: number) => {
      if (width === 0 || height === 0) {
        animId = requestAnimationFrame(draw);
        return;
      }

      const elapsed = (now - startTime) * 0.001 * speed;

      // Smooth mouse interpolation
      const m = mouseRef.current;
      m.x += (m.targetX - m.x) * 0.08;
      m.y += (m.targetY - m.y) * 0.08;

      // Fill background
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      // Create pixel buffer for high-performance dither rendering
      const imgData = ctx.createImageData(width, height);
      const data = imgData.data;

      // Center horizon
      const horizonY = height * 0.55;

      for (let py = 0; py < height; py += ditherSize) {
        const normY = py / height;
        const bayerY = Math.floor(py / ditherSize) % 4;

        for (let px = 0; px < width; px += ditherSize) {
          const normX = px / width;
          const bayerX = Math.floor(px / ditherSize) % 4;
          const bayerThreshold = BAYER_4X4[bayerY * 4 + bayerX];

          // Mouse displacement wave
          let mouseDisplacement = 0;
          if (m.active) {
            const dx = normX - m.x;
            const dy = normY - m.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            mouseDisplacement = Math.sin(dist * 24.0 - elapsed * 4.0) * Math.exp(-dist * 4.0) * 22.0;
          }

          // Undulating multi-harmonic wave function
          const wave1 = Math.sin(px * frequency + elapsed * 1.8) * amplitude;
          const wave2 = Math.cos(px * frequency * 2.1 - elapsed * 1.2) * (amplitude * 0.45);
          const wave3 = Math.sin((px * 0.6 + py * 0.4) * frequency + elapsed * 0.9) * (amplitude * 0.35);

          // Perspective depth calculation
          const waveY = horizonY + wave1 + wave2 + wave3 + mouseDisplacement;
          const distToWave = (py - waveY) / (amplitude * 1.8);

          // Compute raw wave intensity
          let intensity = 0;
          if (py >= waveY) {
            // Under-wave gradient
            intensity = Math.max(0, 1.0 - (py - waveY) / (height * 0.48));
            intensity = Math.pow(intensity, 1.4);
          } else {
            // Crest bloom above
            intensity = Math.exp(-Math.abs(distToWave) * 3.2) * 0.65;
          }

          // Dither comparison: if intensity > Bayer threshold, illuminate pixel block
          const isLit = intensity > bayerThreshold;

          // Block fill
          for (let dy = 0; dy < ditherSize && py + dy < height; dy++) {
            for (let dx = 0; dx < ditherSize && px + dx < width; dx++) {
              const idx = ((py + dy) * width + (px + dx)) * 4;
              if (isLit) {
                // Modulate color based on depth
                const brightness = Math.min(1.0, intensity * 1.2);
                data[idx] = Math.floor(waveRgb[0] * brightness);
                data[idx + 1] = Math.floor(waveRgb[1] * brightness);
                data[idx + 2] = Math.floor(waveRgb[2] * brightness);
                data[idx + 3] = 255;
              } else {
                data[idx] = bgRgb[0];
                data[idx + 1] = bgRgb[1];
                data[idx + 2] = bgRgb[2];
                data[idx + 3] = 255;
              }
            }
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [color, backgroundColor, speed, frequency, amplitude, ditherSize]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn("relative overflow-hidden w-full h-full", className)}
      {...props}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full z-0 select-none opacity-80"
      />
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
}

export default DitherWave;
