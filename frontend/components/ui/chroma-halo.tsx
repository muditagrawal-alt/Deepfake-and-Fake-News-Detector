"use client";

import React, { useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};
const subscribeMedia = (callback: () => void) => {
  const mql = window.matchMedia("(pointer: coarse)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
};

export interface ChromaHaloProps extends React.HTMLAttributes<HTMLDivElement> {
  colors?: string[];
  radius?: number;
  bloomRadius?: number;
  opacity?: number;
  speed?: number;
  decay?: number;
  blendMode?: GlobalCompositeOperation;
  burstOnClick?: boolean;
  interactive?: boolean;
  className?: string;
}

interface InkDroplet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  currentRadius: number;
  targetRadius: number;
  color: [number, number, number];
  opacity: number;
  maxAge: number;
  age: number;
  expansionRate: number;
}

function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace("#", "");
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [139, 92, 246]; // default violet
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

const DEFAULT_COLORS = [
  "#06b6d4", // Electric Cyan
  "#3b82f6", // Cobalt Blue
  "#8b5cf6", // Ultraviolet Violet
  "#ec4899", // Magenta Bloom
  "#f59e0b", // Solar Amber
];

export function ChromaHalo({
  colors = DEFAULT_COLORS,
  radius = 110,
  bloomRadius = 70,
  opacity = 0.85,
  speed = 1.0,
  decay = 1.0,
  blendMode = "screen",
  burstOnClick = true,
  interactive = true,
  className,
  ...props
}: ChromaHaloProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduceMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(reduceMotion);

  // React 19 hydration-safe client mounting & coarse pointer detection
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const isTouchDevice = useSyncExternalStore(
    subscribeMedia,
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false
  );

  // Mouse / Pointer State
  const pointerPos = useRef<{ x: number; y: number }>({ x: -500, y: -500 });
  const prevPointerPos = useRef<{ x: number; y: number }>({ x: -500, y: -500 });
  const lerpPos = useRef<{ x: number; y: number }>({ x: -500, y: -500 });
  const pointerSpeed = useRef<number>(0);
  const isPointerInside = useRef<boolean>(false);
  const isHoveringInteractive = useRef<boolean>(false);
  const colorIndexRef = useRef<number>(0);

  // Active ink droplets
  const dropletsRef = useRef<InkDroplet[]>([]);
  const isRunningRef = useRef<boolean>(false);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Pre-parsed RGB colors
  const parsedColors = useRef<[number, number, number][]>([]);
  useEffect(() => {
    parsedColors.current = (colors.length > 0 ? colors : DEFAULT_COLORS).map(hexToRgb);
  }, [colors]);

  const spawnDroplet = useCallback(
    (
      x: number,
      y: number,
      vx = 0,
      vy = 0,
      customTargetRadius?: number,
      customMaxAge?: number
    ) => {
      if (shouldReduceMotion || isTouchDevice) return;

      const palette = parsedColors.current;
      if (palette.length === 0) return;

      const color = palette[colorIndexRef.current % palette.length];
      colorIndexRef.current = (colorIndexRef.current + 1) % palette.length;

      const targetRad = customTargetRadius ?? bloomRadius * (0.8 + Math.random() * 0.5);
      const maxAge = (customMaxAge ?? 1.2) / Math.max(0.2, decay);

      dropletsRef.current.push({
        x,
        y,
        vx,
        vy,
        currentRadius: targetRad * 0.25,
        targetRadius: targetRad,
        color,
        opacity: opacity * (0.85 + Math.random() * 0.25),
        maxAge,
        age: 0,
        expansionRate: 0.12 * speed,
      });

      // Limit max droplets for smooth 60fps
      if (dropletsRef.current.length > 60) {
        dropletsRef.current.shift();
      }
    },
    [bloomRadius, decay, opacity, shouldReduceMotion, speed, isTouchDevice]
  );

  const startAnimation = useCallback(() => {
    if (isRunningRef.current || shouldReduceMotion || isTouchDevice) return;
    isRunningRef.current = true;
    lastTimeRef.current = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = currentTime;

      const canvas = canvasRef.current;
      if (!canvas) {
        isRunningRef.current = false;
        return;
      }

      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) {
        isRunningRef.current = false;
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      // Smooth cursor lerp
      const targetX = pointerPos.current.x;
      const targetY = pointerPos.current.y;
      lerpPos.current.x += (targetX - lerpPos.current.x) * 0.25;
      lerpPos.current.y += (targetY - lerpPos.current.y) * 0.25;

      // Clear frame in raw pixel coordinates
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.globalCompositeOperation = blendMode;

      // 1. Draw Active Ink Droplets (blooming trails)
      const droplets = dropletsRef.current;
      for (let i = droplets.length - 1; i >= 0; i--) {
        const d = droplets[i];
        d.age += dt;

        if (d.age >= d.maxAge) {
          droplets.splice(i, 1);
          continue;
        }

        // Bloom expansion: rapidly expands like ink dropping in water
        d.currentRadius += (d.targetRadius - d.currentRadius) * d.expansionRate;
        d.x += d.vx * 60 * dt;
        d.y += d.vy * 60 * dt;
        d.vx *= Math.pow(0.92, dt * 60);
        d.vy *= Math.pow(0.92, dt * 60);

        // Organic non-linear opacity fade
        const lifeRatio = d.age / d.maxAge;
        const fade = Math.pow(1 - lifeRatio, 1.8);
        const currentOpacity = d.opacity * fade;

        if (currentOpacity <= 0.005 || d.currentRadius <= 1) continue;

        const rad = Math.max(1, d.currentRadius);
        const gradient = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, rad);

        const [r, g, b] = d.color;
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${currentOpacity})`);
        gradient.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, ${currentOpacity * 0.65})`);
        gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${currentOpacity * 0.2})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(d.x, d.y, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Draw Main Smooth Ambient Cursor Halo
      if (
        isPointerInside.current &&
        lerpPos.current.x >= -50 &&
        lerpPos.current.x <= width + 50 &&
        lerpPos.current.y >= -50 &&
        lerpPos.current.y <= height + 50
      ) {
        const baseRad = isHoveringInteractive.current ? radius * 1.35 : radius;
        // Dynamically swell slightly with velocity
        const dynamicRad = baseRad * (1 + Math.min(pointerSpeed.current * 0.008, 0.4));
        const [r, g, b] =
          parsedColors.current[colorIndexRef.current % parsedColors.current.length] ?? [
            139, 92, 246,
          ];

        const haloGrad = ctx.createRadialGradient(
          lerpPos.current.x,
          lerpPos.current.y,
          0,
          lerpPos.current.x,
          lerpPos.current.y,
          dynamicRad
        );

        const haloAlpha = isHoveringInteractive.current ? opacity * 0.9 : opacity * 0.6;
        haloGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${haloAlpha})`);
        haloGrad.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, ${haloAlpha * 0.45})`);
        haloGrad.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${haloAlpha * 0.12})`);
        haloGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(lerpPos.current.x, lerpPos.current.y, dynamicRad, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Sleep optimization: If stationary and all droplets dissolved, stop loop
      const hasActiveDroplets = droplets.length > 0;
      const isMoving = pointerSpeed.current > 0.05;

      if (hasActiveDroplets || isPointerInside.current || isMoving) {
        // Decay instantaneous velocity
        pointerSpeed.current *= 0.9;
        animFrameIdRef.current = requestAnimationFrame(loop);
      } else {
        isRunningRef.current = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(loop);
  }, [blendMode, isTouchDevice, opacity, radius, shouldReduceMotion]);

  // Window resize handler (always executed whenever mounted changes or window resizes)
  useEffect(() => {
    if (!mounted || isTouchDevice || shouldReduceMotion) return;

    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [mounted, isTouchDevice, shouldReduceMotion]);

  // Pointer movement & interaction handlers
  useEffect(() => {
    if (!mounted || shouldReduceMotion || isTouchDevice) return;

    let distanceAccumulator = 0;

    const handlePointerMove = (e: MouseEvent | PointerEvent) => {
      if ("pointerType" in e && e.pointerType === "touch") return;

      const x = e.clientX;
      const y = e.clientY;

      if (!isPointerInside.current) {
        isPointerInside.current = true;
        lerpPos.current = { x, y };
        prevPointerPos.current = { x, y };
      }

      const dx = x - prevPointerPos.current.x;
      const dy = y - prevPointerPos.current.y;
      const dist = Math.hypot(dx, dy);

      pointerSpeed.current = dist;
      pointerPos.current = { x, y };

      // Detect interactive element hover
      if (interactive && e.target instanceof Element) {
        const interactiveTarget = e.target.closest(
          'a, button, input, select, textarea, [role="button"], [data-interactive="true"], .cursor-pointer'
        );
        isHoveringInteractive.current = Boolean(interactiveTarget);
      }

      // Ink trail spawning: spawn droplet every 16px of travel
      distanceAccumulator += dist;
      const spawnInterval = isHoveringInteractive.current ? 12 : 16;

      if (distanceAccumulator >= spawnInterval && dist > 1.2) {
        distanceAccumulator = 0;
        // Tangential slight velocity offset
        const normX = dx / (dist || 1);
        const normY = dy / (dist || 1);
        const perpX = -normY * (Math.random() - 0.5) * 1.5;
        const perpY = normX * (Math.random() - 0.5) * 1.5;

        spawnDroplet(x, y, normX * 0.4 + perpX, normY * 0.4 + perpY);
      }

      prevPointerPos.current = { x, y };
      startAnimation();
    };

    const handlePointerDown = (e: MouseEvent | PointerEvent) => {
      if (("pointerType" in e && e.pointerType === "touch") || !burstOnClick) return;

      const x = e.clientX;
      const y = e.clientY;

      // Burst of ink droplets on click (ink bloom ripple)
      const count = 10;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
        const burstSpeed = 1.2 + Math.random() * 2.4;
        const vx = Math.cos(angle) * burstSpeed;
        const vy = Math.sin(angle) * burstSpeed;
        const rad = bloomRadius * (0.9 + Math.random() * 0.7);

        spawnDroplet(x, y, vx, vy, rad, 1.4);
      }

      startAnimation();
    };

    const handlePointerLeave = () => {
      isPointerInside.current = false;
      isHoveringInteractive.current = false;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("mousedown", handlePointerDown, { passive: true });
    document.addEventListener("pointerleave", handlePointerLeave, { passive: true });
    document.addEventListener("mouseleave", handlePointerLeave, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("pointerleave", handlePointerLeave);
      document.removeEventListener("mouseleave", handlePointerLeave);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [
    mounted,
    burstOnClick,
    interactive,
    isTouchDevice,
    shouldReduceMotion,
    spawnDroplet,
    startAnimation,
    bloomRadius,
  ]);

  if (isTouchDevice || shouldReduceMotion) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-0 z-[9999] overflow-hidden select-none transition-opacity duration-300",
        mounted ? "opacity-100" : "opacity-0",
        className
      )}
      {...props}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full select-none"
      />
    </div>
  );
}

export default ChromaHalo;
