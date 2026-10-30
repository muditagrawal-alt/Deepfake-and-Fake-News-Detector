"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Node3D extends Point3D {
  label: string;
  status: "corroborated" | "contradicted" | "neutral";
  size: number;
}

interface LayerConfig {
  name: string;
  subtext: string;
  zOffset: number;
  color: string;
  accent: string;
}

const LAYERS: LayerConfig[] = [
  {
    name: "Layer 01 // Semantic Claim Graph",
    subtext: "Triangulated against open web sources",
    zOffset: 95,
    color: "rgba(255, 255, 255, 0.12)",
    accent: "#72c994", // corroborated
  },
  {
    name: "Layer 02 // Frequency & Residual Matrix",
    subtext: "Noise variance, FFT harmonics, compression anomalies",
    zOffset: 0,
    color: "rgba(255, 255, 255, 0.08)",
    accent: "#e3b567", // warning
  },
  {
    name: "Layer 03 // Provenance & Container Manifest",
    subtext: "C2PA cryptographic chain, EXIF hash, camera sensor PRNU",
    zOffset: -95,
    color: "rgba(255, 255, 255, 0.08)",
    accent: "#f08d84", // signal
  },
];

export default function ForensicCanvas3D({
  scrollProgress = 0,
  className = "",
}: {
  scrollProgress?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();
  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number>(0);

  // Interactive rotation state with physics momentum
  const rotX = useRef(0.32); // pitch
  const rotY = useRef(0.55); // yaw
  const targetRotX = useRef(0.32);
  const targetRotY = useRef(0.55);
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Mouse handlers for intuitive 3D orbit
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    targetRotY.current += dx * 0.008;
    targetRotX.current = Math.max(-0.8, Math.min(0.8, targetRotX.current + dy * 0.008));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDragging.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Smooth inertia interpolation
      if (!reduceMotion) {
        rotX.current += (targetRotX.current - rotX.current) * 0.08;
        rotY.current += (targetRotY.current - rotY.current) * 0.08;
      }

      // Scroll-driven layer explosion (separation factor)
      const separationFactor = 1 + scrollProgress * 0.9;
      const time = Date.now() * 0.001;

      // 3D Projection math
      const cx = width / 2;
      const cy = height / 2;
      const fov = 380;

      const cosX = Math.cos(rotX.current);
      const sinX = Math.sin(rotX.current);
      const cosY = Math.cos(rotY.current);
      const sinY = Math.sin(rotY.current);

      const project = (p: Point3D) => {
        // Rotate Y (Yaw)
        const x1 = p.x * cosY + p.z * sinY;
        const y1 = p.y;
        const z1 = -p.x * sinY + p.z * cosY;

        // Rotate X (Pitch)
        const x2 = x1;
        const y2 = y1 * cosX - z1 * sinX;
        const z2 = y1 * sinX + z1 * cosX + 360; // Camera distance

        const scale = fov / Math.max(z2, 10);
        return {
          x: cx + x2 * scale,
          y: cy + y2 * scale,
          scale,
          depth: z2,
        };
      };

      // Draw scan laser line across the 3D volume
      const laserZ = Math.sin(time * 1.8) * 110 * separationFactor;
      const pLaserA = project({ x: -140, y: -90, z: laserZ });
      const pLaserB = project({ x: 140, y: -90, z: laserZ });
      const pLaserC = project({ x: 140, y: 90, z: laserZ });
      const pLaserD = project({ x: -140, y: 90, z: laserZ });

      // Laser plane
      ctx.beginPath();
      ctx.moveTo(pLaserA.x, pLaserA.y);
      ctx.lineTo(pLaserB.x, pLaserB.y);
      ctx.lineTo(pLaserC.x, pLaserC.y);
      ctx.lineTo(pLaserD.x, pLaserD.y);
      ctx.closePath();
      const laserGrad = ctx.createLinearGradient(pLaserA.x, pLaserA.y, pLaserC.x, pLaserC.y);
      laserGrad.addColorStop(0, "rgba(114, 201, 148, 0.02)");
      laserGrad.addColorStop(0.5, "rgba(114, 201, 148, 0.12)");
      laserGrad.addColorStop(1, "rgba(114, 201, 148, 0.02)");
      ctx.fillStyle = laserGrad;
      ctx.fill();

      // Draw each 3D Layer Plate
      LAYERS.forEach((layer, idx) => {
        const z = layer.zOffset * separationFactor;
        const sizeX = 130;
        const sizeY = 85;

        const corners = [
          project({ x: -sizeX, y: -sizeY, z }),
          project({ x: sizeX, y: -sizeY, z }),
          project({ x: sizeX, y: sizeY, z }),
          project({ x: -sizeX, y: sizeY, z }),
        ];

        // Draw bounding plate
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        corners.forEach((c) => ctx.lineTo(c.x, c.y));
        ctx.closePath();

        // Plate fill with depth fog
        const depthAlpha = Math.max(0.04, Math.min(0.2, 180 / corners[0].depth));
        ctx.fillStyle = `rgba(18, 18, 22, ${depthAlpha * 1.5})`;
        ctx.fill();

        // Plate border
        ctx.strokeStyle = idx === 0 ? "rgba(114, 201, 148, 0.4)" : "rgba(255, 255, 255, 0.14)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Corner technical crosshairs
        corners.forEach((c) => {
          ctx.strokeStyle = layer.accent;
          ctx.beginPath();
          ctx.moveTo(c.x - 4, c.y);
          ctx.lineTo(c.x + 4, c.y);
          ctx.moveTo(c.x, c.y - 4);
          ctx.lineTo(c.x, c.y + 4);
          ctx.stroke();
        });

        // Layer-specific 3D internal geometry
        if (idx === 0) {
          // Semantic Claim Network (3D graph nodes)
          const nodes: Node3D[] = [
            { x: -70, y: -40, z, label: "Reuters (Corroborated)", status: "corroborated", size: 4 },
            { x: 50, y: -30, z, label: "AP Wire (Corroborated)", status: "corroborated", size: 4 },
            { x: -20, y: 35, z, label: "Altered Quote (Contradicted)", status: "contradicted", size: 5 },
            { x: 60, y: 45, z, label: "SEC Filing (Verified)", status: "corroborated", size: 3.5 },
          ];

          // Draw node interconnection lines
          for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
              const p1 = project(nodes[i]);
              const p2 = project(nodes[j]);
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }

          // Draw nodes
          nodes.forEach((node) => {
            const p = project(node);
            ctx.beginPath();
            ctx.arc(p.x, p.y, node.size * (p.scale * 0.9), 0, Math.PI * 2);
            ctx.fillStyle = node.status === "corroborated" ? "#72c994" : "#f08d84";
            ctx.fill();

            // Outer pulse ring
            ctx.beginPath();
            ctx.arc(p.x, p.y, (node.size + 4) * (p.scale * 0.9), 0, Math.PI * 2);
            ctx.strokeStyle = node.status === "corroborated" ? "rgba(114, 201, 148, 0.25)" : "rgba(240, 141, 132, 0.25)";
            ctx.lineWidth = 1;
            ctx.stroke();
          });
        } else if (idx === 1) {
          // Frequency domain waveform grid (oscilloscope slice)
          ctx.beginPath();
          for (let gx = -100; gx <= 100; gx += 20) {
            const wave = Math.sin(gx * 0.05 + time * 2) * 15;
            const p = project({ x: gx, y: wave, z });
            if (gx === -100) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          }
          ctx.strokeStyle = "rgba(227, 181, 103, 0.6)";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Secondary harmonic line
          ctx.beginPath();
          for (let gx = -100; gx <= 100; gx += 20) {
            const wave = Math.cos(gx * 0.08 - time * 1.5) * 8;
            const p = project({ x: gx, y: wave + 20, z });
            if (gx === -100) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          }
          ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (idx === 2) {
          // Cryptographic hash hex matrix (provenance floor)
          const hexPoints = [
            { x: -50, y: -25 },
            { x: 0, y: -25 },
            { x: 50, y: -25 },
            { x: -25, y: 25 },
            { x: 25, y: 25 },
          ];
          hexPoints.forEach((hp) => {
            const p = project({ x: hp.x, y: hp.y, z });
            ctx.strokeStyle = "rgba(240, 141, 132, 0.35)";
            ctx.strokeRect(p.x - 7 * p.scale, p.y - 7 * p.scale, 14 * p.scale, 14 * p.scale);
          });
        }

        // Layer annotation tag with dark backing pill for crisp legibility
        const labelPos = project({ x: -sizeX, y: -sizeY - 14, z });
        const labelText = `L0${idx + 1} :: ${layer.name.split("//")[1]?.trim() || layer.name}`;
        const fontSize = Math.max(9, Math.round(10 * labelPos.scale));
        ctx.font = `${fontSize}px var(--font-mono, monospace)`;
        const textWidth = ctx.measureText(labelText).width;

        ctx.fillStyle = "rgba(6, 6, 8, 0.85)";
        ctx.fillRect(labelPos.x - 3, labelPos.y - fontSize + 1, textWidth + 6, fontSize + 4);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.strokeRect(labelPos.x - 3, labelPos.y - fontSize + 1, textWidth + 6, fontSize + 4);

        ctx.fillStyle = idx === 0 ? "#72c994" : "rgba(255, 255, 255, 0.8)";
        ctx.fillText(labelText, labelPos.x, labelPos.y);
      });

      // Vertical structural axis connecting plates
      const topCenter = project({ x: 0, y: 0, z: LAYERS[0].zOffset * separationFactor });
      const bottomCenter = project({ x: 0, y: 0, z: LAYERS[2].zOffset * separationFactor });
      ctx.beginPath();
      ctx.setLineDash([2, 4]);
      ctx.moveTo(topCenter.x, topCenter.y);
      ctx.lineTo(bottomCenter.x, bottomCenter.y);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [scrollProgress, reduceMotion]);

  return (
    <div className={`relative w-full select-none ${className}`}>
      {/* 3D Canvas element */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full h-[400px] sm:h-[480px] cursor-grab active:cursor-grabbing touch-none block"
        aria-label="Interactive 3D representation of Veritas three-layer inspection architecture. Drag to rotate."
        role="img"
      />

      {/* Interactive HUD Overlay */}
      <div className="absolute top-4 left-4 pointer-events-none flex items-center gap-3 font-mono text-[11px] text-white/50">
        <span className="flex items-center gap-1.5 px-2 py-1 rounded border border-white/10 bg-black/60 backdrop-blur-md">
          <span className="size-1.5 rounded-full bg-real animate-pulse" />
          <span>3D ROTATION: DRAG TO INSPECT</span>
        </span>
        <span className="hidden sm:inline px-2 py-1 rounded border border-white/10 bg-black/60 backdrop-blur-md">
          <span>LAYERS: 03 ACTIVE</span>
        </span>
      </div>

      {/* Layer selector pills */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {LAYERS.map((l, i) => (
            <button
              key={l.name}
              type="button"
              onClick={() => {
                targetRotX.current = 0.25;
                targetRotY.current = i === 0 ? 0.4 : i === 1 ? -0.3 : 0.8;
                setSelectedLayerIndex(i);
              }}
              className={`px-2.5 py-1 rounded-md border text-[11px] font-mono transition-colors ${
                selectedLayerIndex === i
                  ? "border-real text-real bg-real/10"
                  : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/30 hover:text-white"
              }`}
            >
              L0{i + 1}
            </button>
          ))}
        </div>
        <span className="font-mono text-[11px] text-white/40">Z-AXIS SEPARATION: AUTO-SCROLL</span>
      </div>
    </div>
  );
}
