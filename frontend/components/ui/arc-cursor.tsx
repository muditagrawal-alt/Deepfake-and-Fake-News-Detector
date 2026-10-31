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
  if (isNaN(num)) return [0, 229, 255]; // default electric cyan
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

interface ChainNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
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
const NUM_CHAIN_NODES = 28;

// Catmull-Rom cubic interpolation between 4 control points
function catmullRom(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number
): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

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

  // Smooth chain of spring-damped nodes
  const chainRef = useRef<ChainNode[]>(
    Array.from({ length: NUM_CHAIN_NODES }, () => ({
      x: -200,
      y: -200,
      vx: 0,
      vy: 0,
    }))
  );

  const targetPos = useRef<{ x: number; y: number }>({ x: -200, y: -200 });
  const mouseActive = useRef<boolean>(false);
  const lastMoveTime = useRef<number>(0);
  const cursorVelocity = useRef<number>(0);
  const sparksRef = useRef<Spark[]>([]);
  const dischargesRef = useRef<DischargeBranch[]>([]);

  // Autoplay position state
  const autoPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const autoAngle = useRef<number>(0);

  const clear = useCallback(() => {
    for (const node of chainRef.current) {
      node.x = -200;
      node.y = -200;
      node.vx = 0;
      node.vy = 0;
    }
    sparksRef.current = [];
    dischargesRef.current = [];
  }, []);

  const discharge = useCallback((coords?: { x: number; y: number }) => {
    const origin = coords || targetPos.current;
    if (origin.x < 0 || origin.y < 0) return;

    // Create 8-14 radiating branching lightning forks
    const numForks = Math.floor(8 + Math.random() * 6);
    const newDischarges: DischargeBranch[] = [];

    for (let f = 0; f < numForks; f++) {
      const baseAngle = (Math.PI * 2 * f) / numForks + (Math.random() - 0.5) * 0.4;
      const forkLength = 50 + Math.random() * 90;
      const steps = Math.floor(forkLength / 8);
      const points: { x: number; y: number }[] = [{ x: origin.x, y: origin.y }];

      let cx = origin.x;
      let cy = origin.y;
      for (let s = 1; s <= steps; s++) {
        const stepDist = forkLength / steps;
        const jitterAngle = baseAngle + (Math.random() - 0.5) * 0.8;
        cx += Math.cos(jitterAngle) * stepDist;
        cy += Math.sin(jitterAngle) * stepDist;
        points.push({ x: cx, y: cy });
      }

      newDischarges.push({
        points,
        life: 0,
        maxLife: 0.2 + Math.random() * 0.12,
        color: Math.random() > 0.4 ? rgbPrimary.current : rgbSecondary.current,
        width: 1.2 + Math.random() * 1.6,
      });
    }

    dischargesRef.current.push(...newDischarges);

    // Spawn explosive kinetic sparks
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speedP = 60 + Math.random() * 200;
      sparksRef.current.push({
        x: origin.x,
        y: origin.y,
        vx: Math.cos(angle) * speedP,
        vy: Math.sin(angle) * speedP,
        life: 0,
        maxLife: 0.25 + Math.random() * 0.35,
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
      const px = e.clientX;
      const py = e.clientY;

      if (targetPos.current.x < 0) {
        // Initialize chain at mouse position on first entrance
        for (const node of chainRef.current) {
          node.x = px;
          node.y = py;
        }
      }

      const dx = px - targetPos.current.x;
      const dy = py - targetPos.current.y;
      cursorVelocity.current = Math.hypot(dx, dy);

      targetPos.current = { x: px, y: py };
      mouseActive.current = true;
      lastMoveTime.current = performance.now() / 1000;

      // Spawn soft plasma micro-sparks when moving fast
      if (charge > 0 && Math.random() < 0.4 * charge && !reducedMotion) {
        const sparkAngle = Math.random() * Math.PI * 2;
        const sparkSpeed = 20 + Math.random() * 60;
        sparksRef.current.push({
          x: px + (Math.random() - 0.5) * 6,
          y: py + (Math.random() - 0.5) * 6,
          vx: Math.cos(sparkAngle) * sparkSpeed,
          vy: Math.sin(sparkAngle) * sparkSpeed,
          life: 0,
          maxLife: 0.14 + Math.random() * 0.16,
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

      // Blending mode: screen/lighter for luminous neon glow on dark, source-over for ink on light
      ctx.globalCompositeOperation = isDarkTheme ? "screen" : "source-over";

      // Autoplay idle wandering motion
      const isIdle =
        autoplay && (!mouseActive.current || now - lastMoveTime.current > idleDelay);

      if (isIdle && !reducedMotion) {
        autoAngle.current += dt * autoplaySpeed * 1.1;
        const centerX = w * 0.5;
        const centerY = h * 0.42;
        const rx = Math.min(w * 0.35, 420);
        const ry = Math.min(h * 0.28, 260);

        // Smooth flowing Lissajous trajectory
        const nx = centerX + Math.sin(autoAngle.current) * rx;
        const ny = centerY + Math.sin(autoAngle.current * 2) * 0.5 * ry;
        targetPos.current = { x: nx, y: ny };
        cursorVelocity.current = 40;

        if (chainRef.current[0].x < 0) {
          for (const node of chainRef.current) {
            node.x = nx;
            node.y = ny;
          }
        }
      }

      // Smooth decay on velocity
      cursorVelocity.current *= 0.94;

      // Update chain nodes with spring-damping physics for flowing movement
      const chain = chainRef.current;
      const head = chain[0];
      const target = targetPos.current;

      if (target.x >= 0) {
        // Head follows target smoothly
        head.x += (target.x - head.x) * 0.65;
        head.y += (target.y - head.y) * 0.65;

        // Tail nodes follow previous nodes with spring lag (flowing whip effect)
        const followRate = Math.min(0.65, 0.45 * (0.6 / Math.max(0.2, length)));
        for (let i = 1; i < chain.length; i++) {
          const prev = chain[i - 1];
          const curr = chain[i];
          curr.x += (prev.x - curr.x) * followRate;
          curr.y += (prev.y - curr.y) * followRate;
        }
      }

      // Calculate total span of chain to know if arc is moving
      let totalSpan = 0;
      for (let i = 1; i < chain.length; i++) {
        totalSpan += Math.hypot(chain[i].x - chain[i - 1].x, chain[i].y - chain[i - 1].y);
      }

      // Compute flicker intensity multiplier
      let currentFlicker = 1.0;
      if (!reducedMotion && flicker > 0) {
        currentFlicker =
          1.0 + (Math.sin(now * 32.0 * speed) * 0.18 + (Math.random() - 0.5) * 0.25) * flicker;
        currentFlicker = Math.max(0.4, Math.min(1.5, currentFlicker * intensity));
      } else {
        currentFlicker = intensity;
      }

      // Render flowing braided electric filaments
      if (head.x >= 0 && totalSpan > 3) {
        const numStrands = Math.max(1, Math.min(4, Math.round(strands)));
        const totalSamples = 90; // Dense sampling along smooth Catmull-Rom spline

        for (let sIndex = 0; sIndex < numStrands; sIndex++) {
          const strandPhase = (sIndex * Math.PI * 2) / numStrands;
          const isPrimary = sIndex === 0;
          const strandFactor = isPrimary ? 1.0 : 0.65;
          const [cr1, cg1, cb1] = isPrimary ? rgbPrimary.current : rgbSecondary.current;

          const splinePoints: { x: number; y: number; alpha: number }[] = [];

          for (let s = 0; s <= totalSamples; s++) {
            const u = s / totalSamples; // 0 at head (cursor), 1 at tail
            // Map u to node index in chain
            const rawIdx = u * (chain.length - 1);
            const idx = Math.floor(rawIdx);
            const t = rawIdx - idx;

            // 4 control points for Catmull-Rom
            const p0 = chain[Math.max(0, idx - 1)];
            const p1 = chain[idx];
            const p2 = chain[Math.min(chain.length - 1, idx + 1)];
            const p3 = chain[Math.min(chain.length - 1, idx + 2)];

            // Interpolate smooth base position
            const bx = catmullRom(p0.x, p1.x, p2.x, p3.x, t);
            const by = catmullRom(p0.y, p1.y, p2.y, p3.y, t);

            // Compute tangent and normal vector
            const nextT = Math.min(1, t + 0.05);
            const tx = catmullRom(p0.x, p1.x, p2.x, p3.x, nextT) - bx;
            const ty = catmullRom(p0.y, p1.y, p2.y, p3.y, nextT) - by;
            const tLen = Math.hypot(tx, ty) || 1;
            const nx = -ty / tLen;
            const ny = tx / tLen;

            // Flowing undulation & organic micro-crackle
            let jitter = 0;
            if (!reducedMotion) {
              // Smooth traveling sine wave flowing down the ribbon
              const travelingWave = Math.sin(u * 12.0 - now * 9.0 * speed + strandPhase) * (bend * 0.45);
              // High-frequency fractal crackle
              const microCrackle = (fractalNoise(u * 22.0 - now * 15.0 * speed + strandPhase) - 0.5) * (crackle * 3.2);
              // Smooth envelope: 0 at head, maximum along mid-arc, smoothly tapers to 0 at tail
              const envelope = Math.sin(Math.pow(1 - u, 0.65) * Math.PI);
              jitter = (travelingWave + microCrackle) * envelope;
            }

            // Alpha smoothly tapers off towards the tail
            const alphaProgress = Math.pow(Math.max(0, 1 - u), 1.1);

            splinePoints.push({
              x: bx + nx * jitter,
              y: by + ny * jitter,
              alpha: alphaProgress * currentFlicker,
            });
          }

          if (splinePoints.length >= 2) {
            // Layer 1: Outer soft luminous bloom
            if (glow > 0 && isDarkTheme) {
              ctx.lineWidth = Math.max(1.2, thickness * 5.5 * glow * strandFactor);
              ctx.strokeStyle = `rgba(${cr1}, ${cg1}, ${cb1}, ${0.16 * glow * intensity})`;
              ctx.lineCap = "round";
              ctx.lineJoin = "round";
              ctx.beginPath();
              ctx.moveTo(splinePoints[0].x, splinePoints[0].y);
              for (let j = 1; j < splinePoints.length; j++) {
                ctx.lineTo(splinePoints[j].x, splinePoints[j].y);
              }
              ctx.stroke();
            }

            // Layer 2: Main vibrant electric body
            ctx.lineWidth = Math.max(0.8, thickness * 2.0 * strandFactor);
            ctx.strokeStyle = `rgba(${cr1}, ${cg1}, ${cb1}, ${0.8 * intensity})`;
            ctx.beginPath();
            ctx.moveTo(splinePoints[0].x, splinePoints[0].y);
            for (let j = 1; j < splinePoints.length; j++) {
              ctx.lineTo(splinePoints[j].x, splinePoints[j].y);
            }
            ctx.stroke();

            // Layer 3: Ultra-thin white-hot inner core
            ctx.lineWidth = Math.max(0.5, thickness * 0.85 * strandFactor);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * intensity})`;
            ctx.beginPath();
            ctx.moveTo(splinePoints[0].x, splinePoints[0].y);
            for (let j = 1; j < splinePoints.length; j++) {
              ctx.lineTo(splinePoints[j].x, splinePoints[j].y);
            }
            ctx.stroke();

            // Intermittent organic lightning branch splitting off
            if (
              branches > 0 &&
              !reducedMotion &&
              isPrimary &&
              Math.random() < branches * 0.22
            ) {
              const randIdx = Math.floor(splinePoints.length * (0.25 + Math.random() * 0.5));
              const bp = splinePoints[randIdx];
              if (bp) {
                const branchAngle = Math.random() * Math.PI * 2;
                const bLen = 12 + Math.random() * 20;
                ctx.lineWidth = Math.max(0.5, thickness * 0.7);
                ctx.strokeStyle = `rgba(${cr1}, ${cg1}, ${cb1}, 0.65)`;
                ctx.beginPath();
                ctx.moveTo(bp.x, bp.y);
                const midX = bp.x + Math.cos(branchAngle + (Math.random() - 0.5) * 0.4) * (bLen * 0.5);
                const midY = bp.y + Math.sin(branchAngle + (Math.random() - 0.5) * 0.4) * (bLen * 0.5);
                const endX = bp.x + Math.cos(branchAngle) * bLen;
                const endY = bp.y + Math.sin(branchAngle) * bLen;
                ctx.lineTo(midX, midY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
              }
            }
          }
        }

        // Luminous electric charge corona at cursor tip
        if (charge > 0) {
          const [pr, pg, pb] = rgbPrimary.current;
          const tipRadius = 2.4 * thickness * (1 + 0.25 * Math.sin(now * 25));

          const grad = ctx.createRadialGradient(
            head.x,
            head.y,
            0,
            head.x,
            head.y,
            tipRadius * 3.5
          );
          grad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * currentFlicker})`);
          grad.addColorStop(0.35, `rgba(${pr}, ${pg}, ${pb}, ${0.7 * currentFlicker})`);
          grad.addColorStop(1, `rgba(${pr}, ${pg}, ${pb}, 0)`);

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(head.x, head.y, tipRadius * 3.5, 0, Math.PI * 2);
          ctx.fill();

          // White center spark
          ctx.fillStyle = `rgba(255, 255, 255, ${0.98 * currentFlicker})`;
          ctx.beginPath();
          ctx.arc(head.x, head.y, tipRadius * 0.9, 0, Math.PI * 2);
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

        ctx.lineWidth = item.width * 3.5;
        ctx.strokeStyle = `rgba(${dr}, ${dg}, ${db}, ${alpha * 0.35 * intensity})`;
        ctx.beginPath();
        ctx.moveTo(item.points[0].x, item.points[0].y);
        for (let p = 1; p < item.points.length; p++) {
          ctx.lineTo(item.points[p].x, item.points[p].y);
        }
        ctx.stroke();

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
