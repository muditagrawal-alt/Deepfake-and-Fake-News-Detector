"use client";

import React, {
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  useSyncExternalStore,
  forwardRef,
} from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export interface ArcCursorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "color"> {
  color?: string[];
  colors?: [string, string] | string[];
  mode?: "auto" | "glow" | "ink";
  strands?: number;
  branches?: number;
  thickness?: number;
  glow?: number;
  intensity?: number;
  length?: number;
  bend?: number;
  crackle?: number;
  speed?: number;
  flicker?: number;
  charge?: number;
  backgroundColor?: string;
  autoplay?: boolean;
  autoplaySpeed?: number;
  idleDelay?: number;
  interactive?: boolean;
  paused?: boolean;
  dpr?: number;
  className?: string;
}

export interface ArcCursorRef {
  discharge: (coords?: { x: number; y: number }) => void;
  clear: () => void;
}

const emptySubscribe = () => () => {};
const subscribeCoarse = (callback: () => void) => {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia("(pointer: coarse)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
};

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function smoothNoise(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3.0 - 2.0 * f);
  return (1.0 - u) * hash(i) + u * hash(i + 1.0);
}

function fractalNoise(x: number, octaves = 3): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let o = 0; o < octaves; o++) {
    val += amp * smoothNoise(x * freq);
    freq *= 2.1;
    amp *= 0.5;
  }
  return val;
}

function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [56, 189, 248]; // default cyan
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

interface TrailPoint {
  x: number;
  y: number;
  time: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: [number, number, number];
}

interface DischargeBranch {
  points: { x: number; y: number }[];
  life: number;
  maxLife: number;
  color: [number, number, number];
  width: number;
}

const DEFAULT_COLORS: [string, string] = ["#00e5ff", "#818cf8"];

export const ArcCursor = forwardRef<ArcCursorRef, ArcCursorProps>(function ArcCursor(
  {
    color,
    colors: colorsProp,
    mode = "auto",
    strands = 1,
    branches = 0.35,
    thickness = 1.6,
    glow = 1.0,
    intensity = 1.0,
    length = 0.55,
    bend = 10,
    crackle = 1.5,
    speed = 1.0,
    flicker = 0.5,
    charge = 1.0,
    backgroundColor = "transparent",
    autoplay = true,
    autoplaySpeed = 1.0,
    idleDelay = 1.5,
    interactive = true,
    paused = false,
    dpr = 2,
    className,
    style,
    ...rest
  },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const reducedMotion = useReducedMotion();
  const isCoarse = useSyncExternalStore(
    subscribeCoarse,
    () => (typeof window !== "undefined" ? window.matchMedia("(pointer: coarse)").matches : false),
    () => false
  );

  const activeColors = colorsProp || color || DEFAULT_COLORS;
  const rgbPrimary = useRef<[number, number, number]>([0, 229, 255]);
  const rgbSecondary = useRef<[number, number, number]>([129, 140, 248]);

  useEffect(() => {
    if (activeColors.length > 0) rgbPrimary.current = hexToRgb(activeColors[0]);
    if (activeColors.length > 1) rgbSecondary.current = hexToRgb(activeColors[1]);
    else rgbSecondary.current = rgbPrimary.current;
  }, [activeColors]);

  // Trail state
  const trailRef = useRef<TrailPoint[]>([]);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: -100, y: -100 });
  const mouseActive = useRef<boolean>(false);
  const lastMoveTime = useRef<number>(0);
  const sparksRef = useRef<Spark[]>([]);
  const dischargesRef = useRef<DischargeBranch[]>([]);

  // Autoplay position state
  const autoPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const autoAngle = useRef<number>(0);

  const clear = useCallback(() => {
    trailRef.current = [];
    sparksRef.current = [];
    dischargesRef.current = [];
  }, []);

  const discharge = useCallback((coords?: { x: number; y: number }) => {
    const origin = coords || (mouseActive.current ? lastMousePos.current : autoPos.current);
    if (origin.x < 0 || origin.y < 0) return;

    // Create 6-12 branching lightning forks radiating from origin
    const numForks = Math.floor(6 + Math.random() * 6);
    const newDischarges: DischargeBranch[] = [];

    for (let f = 0; f < numForks; f++) {
      const baseAngle = (Math.PI * 2 * f) / numForks + (Math.random() - 0.5) * 0.4;
      const forkLength = 40 + Math.random() * 90;
      const steps = Math.floor(forkLength / 8);
      const points: { x: number; y: number }[] = [{ x: origin.x, y: origin.y }];

      let cx = origin.x;
      let cy = origin.y;
      for (let s = 1; s <= steps; s++) {
        const stepDist = forkLength / steps;
        const jitterAngle = baseAngle + (Math.random() - 0.5) * 0.9;
        cx += Math.cos(jitterAngle) * stepDist;
        cy += Math.sin(jitterAngle) * stepDist;
        points.push({ x: cx, y: cy });
      }

      newDischarges.push({
        points,
        life: 0,
        maxLife: 0.18 + Math.random() * 0.12,
        color: Math.random() > 0.4 ? rgbPrimary.current : rgbSecondary.current,
        width: 1.2 + Math.random() * 1.6,
      });
    }

    dischargesRef.current.push(...newDischarges);

    // Also spawn explosive sparks
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speedP = 60 + Math.random() * 180;
      sparksRef.current.push({
        x: origin.x,
        y: origin.y,
        vx: Math.cos(angle) * speedP,
        vy: Math.sin(angle) * speedP,
        life: 0,
        maxLife: 0.2 + Math.random() * 0.3,
        size: 1 + Math.random() * 2,
        color: Math.random() > 0.3 ? rgbPrimary.current : rgbSecondary.current,
      });
    }
  }, []);

  useImperativeHandle(ref, () => ({
    discharge,
    clear,
  }));

  // Track window resizing and high-DPI scaling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, dpr);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * pixelRatio);
      canvas.height = Math.floor(h * pixelRatio);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(pixelRatio, pixelRatio);
      }
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    return () => window.removeEventListener("resize", resize);
  }, [dpr]);

  // Pointer event listeners
  useEffect(() => {
    if (!interactive || isCoarse) return;

    const handlePointerMove = (e: PointerEvent) => {
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      mouseActive.current = true;
      lastMoveTime.current = performance.now() / 1000;

      trailRef.current.push({
        x: e.clientX,
        y: e.clientY,
        time: performance.now() / 1000,
      });

      // Spawn subtle tip crackle sparks when moving
      if (charge > 0 && Math.random() < 0.45 * charge && !reducedMotion) {
        const sparkAngle = Math.random() * Math.PI * 2;
        const sparkSpeed = 20 + Math.random() * 60;
        sparksRef.current.push({
          x: e.clientX + (Math.random() - 0.5) * 6,
          y: e.clientY + (Math.random() - 0.5) * 6,
          vx: Math.cos(sparkAngle) * sparkSpeed,
          vy: Math.sin(sparkAngle) * sparkSpeed,
          life: 0,
          maxLife: 0.12 + Math.random() * 0.18,
          size: 1 + Math.random() * 1.5,
          color: Math.random() > 0.5 ? rgbPrimary.current : rgbSecondary.current,
        });
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      discharge({ x: e.clientX, y: e.clientY });
    };

    const handlePointerLeave = () => {
      mouseActive.current = false;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [interactive, isCoarse, charge, reducedMotion, discharge]);

  // Main animation render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now() / 1000;

    const render = (nowMs: number) => {
      const now = nowMs / 1000;
      const dt = Math.min(now - lastTime, 0.1);
      lastTime = now;

      const w = window.innerWidth;
      const h = window.innerHeight;

      // Handle pause
      if (paused) {
        animId = requestAnimationFrame(render);
        return;
      }

      // Check current theme mode for blend operation
      const isDarkTheme =
        mode === "glow" ||
        (mode === "auto" &&
          (typeof document !== "undefined"
            ? document.documentElement.classList.contains("dark") ||
              window.matchMedia("(prefers-color-scheme: dark)").matches
            : true));

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, dpr);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (backgroundColor && backgroundColor !== "transparent") {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.scale(pixelRatio, pixelRatio);

      // Determine blending mode: "lighter" or "screen" for dark luminous glow, "source-over" for light ink
      ctx.globalCompositeOperation = isDarkTheme ? "screen" : "source-over";

      // Autoplay idle motion
      const isIdle =
        autoplay && (!mouseActive.current || now - lastMoveTime.current > idleDelay);

      if (isIdle && !reducedMotion) {
        autoAngle.current += dt * autoplaySpeed * 1.2;
        const centerX = w * 0.5;
        const centerY = h * 0.42;
        const rx = Math.min(w * 0.35, 420);
        const ry = Math.min(h * 0.28, 260);

        // Figure-8 Lissajous smooth trajectory
        const nx = centerX + Math.sin(autoAngle.current) * rx;
        const ny = centerY + Math.sin(autoAngle.current * 2) * 0.5 * ry;
        autoPos.current = { x: nx, y: ny };

        trailRef.current.push({
          x: nx,
          y: ny,
          time: now,
        });

        // Spawn intermittent tip spark
        if (charge > 0 && Math.random() < 0.25 * charge) {
          const spAngle = Math.random() * Math.PI * 2;
          sparksRef.current.push({
            x: nx,
            y: ny,
            vx: Math.cos(spAngle) * 35,
            vy: Math.sin(spAngle) * 35,
            life: 0,
            maxLife: 0.15 + Math.random() * 0.15,
            size: 1.2,
            color: Math.random() > 0.5 ? rgbPrimary.current : rgbSecondary.current,
          });
        }
      }

      // Filter out stale trail points
      const maxAge = Math.max(0.1, length);
      trailRef.current = trailRef.current.filter((p) => now - p.time <= maxAge);

      // Compute flicker intensity multiplier
      let currentFlicker = 1.0;
      if (!reducedMotion && flicker > 0) {
        currentFlicker =
          1.0 + (Math.sin(now * 37.0 * speed) * 0.25 + (Math.random() - 0.5) * 0.35) * flicker;
        currentFlicker = Math.max(0.4, Math.min(1.6, currentFlicker * intensity));
      } else {
        currentFlicker = intensity;
      }

      const trail = trailRef.current;

      // Render the braided electric filaments
      if (trail.length >= 2) {
        const numStrands = Math.max(1, Math.min(4, Math.round(strands)));

        for (let sIndex = 0; sIndex < numStrands; sIndex++) {
          const strandPhase = (sIndex * Math.PI * 2) / numStrands;
          const isPrimaryStrand = sIndex === 0;
          const strandWidthFactor = isPrimaryStrand ? 1.0 : 0.65;
          const [cr1, cg1, cb1] = isPrimaryStrand ? rgbPrimary.current : rgbSecondary.current;

          // Generate crackling lightning segment points
          const arcPoints: { x: number; y: number; alpha: number }[] = [];

          for (let i = 0; i < trail.length - 1; i++) {
            const p0 = trail[i];
            const p1 = trail[i + 1];
            const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
            const steps = Math.max(1, Math.ceil(dist / 9));

            const nx = -(p1.y - p0.y) / (dist || 1);
            const ny = (p1.x - p0.x) / (dist || 1);

            for (let step = 0; step < steps; step++) {
              const u = step / steps;
              const bx = p0.x + (p1.x - p0.x) * u;
              const by = p0.y + (p1.y - p0.y) * u;
              const pointTime = p0.time + (p1.time - p0.time) * u;
              const age = now - pointTime;
              const lifeProgress = 1 - age / maxAge; // 1 at cursor head, 0 at tail
              if (lifeProgress <= 0) continue;

              // Organic high-voltage fractal crackle & lateral writhing jitter
              let jitter = 0;
              if (!reducedMotion) {
                const noiseVal = (fractalNoise(pointTime * 14.0 * speed + step * 0.45 + strandPhase * 1.5) - 0.5) * 2.0;
                const lowFreq = Math.sin(pointTime * 6.0 * speed + strandPhase);
                const envelope = Math.sin(Math.pow(lifeProgress, 0.75) * Math.PI);
                jitter = (lowFreq * (bend * 0.4) + noiseVal * crackle * 3.5) * envelope;
              }

              arcPoints.push({
                x: bx + nx * jitter,
                y: by + ny * jitter,
                alpha: Math.pow(Math.max(0, lifeProgress), 1.2) * currentFlicker,
              });
            }
          }

          if (arcPoints.length >= 2) {
            // Layer 1: Outer colored bloom
            if (glow > 0 && isDarkTheme) {
              ctx.lineWidth = Math.max(1, thickness * 6.0 * glow * strandWidthFactor);
              ctx.strokeStyle = `rgba(${cr1}, ${cg1}, ${cb1}, ${0.18 * glow * intensity})`;
              ctx.lineCap = "round";
              ctx.lineJoin = "round";
              ctx.beginPath();
              ctx.moveTo(arcPoints[0].x, arcPoints[0].y);
              for (let j = 1; j < arcPoints.length; j++) {
                ctx.lineTo(arcPoints[j].x, arcPoints[j].y);
              }
              ctx.stroke();
            }

            // Layer 2: Main vibrant electric body
            ctx.lineWidth = Math.max(0.8, thickness * 2.2 * strandWidthFactor);
            ctx.strokeStyle = `rgba(${cr1}, ${cg1}, ${cb1}, ${0.85 * intensity})`;
            ctx.beginPath();
            ctx.moveTo(arcPoints[0].x, arcPoints[0].y);
            for (let j = 1; j < arcPoints.length; j++) {
              ctx.lineTo(arcPoints[j].x, arcPoints[j].y);
            }
            ctx.stroke();

            // Layer 3: White-hot inner core
            ctx.lineWidth = Math.max(0.5, thickness * 0.9 * strandWidthFactor);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * intensity})`;
            ctx.beginPath();
            ctx.moveTo(arcPoints[0].x, arcPoints[0].y);
            for (let j = 1; j < arcPoints.length; j++) {
              ctx.lineTo(arcPoints[j].x, arcPoints[j].y);
            }
            ctx.stroke();

            // Random lightning branch splitting off
            if (
              branches > 0 &&
              !reducedMotion &&
              isPrimaryStrand &&
              Math.random() < branches * 0.25
            ) {
              const randIdx = Math.floor(arcPoints.length * (0.3 + Math.random() * 0.5));
              const bp = arcPoints[randIdx];
              if (bp) {
                const branchAngle = Math.random() * Math.PI * 2;
                const bLen = 14 + Math.random() * 22;
                ctx.lineWidth = Math.max(0.6, thickness * 0.8);
                ctx.strokeStyle = `rgba(${cr1}, ${cg1}, ${cb1}, 0.7)`;
                ctx.beginPath();
                ctx.moveTo(bp.x, bp.y);
                const midX = bp.x + Math.cos(branchAngle + (Math.random() - 0.5) * 0.5) * (bLen * 0.5);
                const midY = bp.y + Math.sin(branchAngle + (Math.random() - 0.5) * 0.5) * (bLen * 0.5);
                const endX = bp.x + Math.cos(branchAngle) * bLen;
                const endY = bp.y + Math.sin(branchAngle) * bLen;
                ctx.lineTo(midX, midY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
              }
            }
          }
        }

        // Electric charge corona at cursor tip
        const headPoint = trail[trail.length - 1];
        if (headPoint && charge > 0) {
          const [pr, pg, pb] = rgbPrimary.current;
          const tipRadius = 2.5 * thickness * (1 + 0.3 * Math.sin(now * 30));

          // Outer tip bloom
          const grad = ctx.createRadialGradient(
            headPoint.x,
            headPoint.y,
            0,
            headPoint.x,
            headPoint.y,
            tipRadius * 4
          );
          grad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * currentFlicker})`);
          grad.addColorStop(0.3, `rgba(${pr}, ${pg}, ${pb}, ${0.7 * currentFlicker})`);
          grad.addColorStop(1, `rgba(${pr}, ${pg}, ${pb}, 0)`);

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(headPoint.x, headPoint.y, tipRadius * 4, 0, Math.PI * 2);
          ctx.fill();

          // White center spark
          ctx.fillStyle = `rgba(255, 255, 255, ${0.98 * currentFlicker})`;
          ctx.beginPath();
          ctx.arc(headPoint.x, headPoint.y, tipRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Render discharge lightning bursts
      for (let d = dischargesRef.current.length - 1; d >= 0; d--) {
        const item = dischargesRef.current[d];
        item.life += dt;
        if (item.life >= item.maxLife) {
          dischargesRef.current.splice(d, 1);
          continue;
        }

        const alpha = Math.max(0, 1 - item.life / item.maxLife);
        const [dr, dg, db] = item.color;

        // Outer glow
        ctx.lineWidth = item.width * 3.5;
        ctx.strokeStyle = `rgba(${dr}, ${dg}, ${db}, ${alpha * 0.35 * intensity})`;
        ctx.beginPath();
        ctx.moveTo(item.points[0].x, item.points[0].y);
        for (let p = 1; p < item.points.length; p++) {
          ctx.lineTo(item.points[p].x, item.points[p].y);
        }
        ctx.stroke();

        // White core
        ctx.lineWidth = Math.max(0.6, item.width);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
        ctx.beginPath();
        ctx.moveTo(item.points[0].x, item.points[0].y);
        for (let p = 1; p < item.points.length; p++) {
          ctx.lineTo(item.points[p].x, item.points[p].y);
        }
        ctx.stroke();
      }

      // Render flying sparks
      for (let s = sparksRef.current.length - 1; s >= 0; s--) {
        const spark = sparksRef.current[s];
        spark.life += dt;
        if (spark.life >= spark.maxLife) {
          sparksRef.current.splice(s, 1);
          continue;
        }

        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.vx *= 0.92;
        spark.vy *= 0.92;

        const lifeFactor = 1 - spark.life / spark.maxLife;
        const [sr, sg, sb] = spark.color;

        ctx.fillStyle = `rgba(${sr}, ${sg}, ${sb}, ${lifeFactor * 0.8})`;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.size * lifeFactor, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 255, 255, ${lifeFactor * 0.95})`;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.size * 0.45 * lifeFactor, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    mode,
    strands,
    branches,
    thickness,
    glow,
    intensity,
    length,
    bend,
    crackle,
    speed,
    flicker,
    charge,
    backgroundColor,
    autoplay,
    autoplaySpeed,
    idleDelay,
    paused,
    reducedMotion,
    dpr,
  ]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={cn("pointer-events-none fixed inset-0 z-50 overflow-hidden", className)}
      style={style}
      {...rest}
    >
      <canvas ref={canvasRef} className="block size-full" />
    </div>
  );
});

export default ArcCursor;
