"use client";

import React from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
  MotionValue,
} from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface ParallaxProduct {
  title: string;
  link: string;
  thumbnail: string;
  category?: string;
  tag?: string;
  status?: string;
  statusVariant?: "success" | "warning" | "danger" | "neutral";
  confidence?: string;
  metric?: string;
  detail?: string;
  visualType?:
    | "waveform"
    | "spectrogram"
    | "mesh"
    | "manifest"
    | "wire"
    | "heatmap"
    | "bootstrap"
    | "ledger";
}

export const HeroParallax = ({
  products,
  header,
  className,
}: {
  products: ParallaxProduct[];
  header?: React.ReactNode;
  className?: string;
}) => {
  const firstRow = products.slice(0, 5);
  const secondRow = products.slice(5, 10);
  const thirdRow = products.slice(10, 15);
  const ref = React.useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(reduceMotion);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const springConfig = { stiffness: 120, damping: 28, mass: 0.2, restDelta: 0.001 };

  const rawTranslateX = useTransform(scrollYProgress, [0.05, 0.88], [0, 520]);
  const rawTranslateXReverse = useTransform(scrollYProgress, [0.05, 0.88], [0, -520]);
  const rawRotateX = useTransform(scrollYProgress, [0.02, 0.35], [14, 0]);
  const rawOpacity = useTransform(scrollYProgress, [0.01, 0.2], [0.35, 1]);
  const rawRotateZ = useTransform(scrollYProgress, [0.02, 0.35], [10, 0]);
  const rawTranslateY = useTransform(scrollYProgress, [0.02, 0.35], [40, 0]);

  const translateX = useSpring(rawTranslateX, springConfig);
  const translateXReverse = useSpring(rawTranslateXReverse, springConfig);
  const rotateX = useSpring(rawRotateX, springConfig);
  const rotateZ = useSpring(rawRotateZ, springConfig);
  const translateY = useSpring(rawTranslateY, springConfig);

  return (
    <div
      ref={ref}
      className={cn(
        "h-[135vh] sm:h-[150vh] py-8 sm:py-12 overflow-hidden antialiased relative flex flex-col self-auto [perspective:1000px] [transform-style:preserve-3d]",
        className
      )}
    >
      {/* Optional ambient background radial gradient */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(79,124,255,0.06)_0%,transparent_70%)]"
        aria-hidden="true"
      />

      {header ?? <Header />}

      <motion.div
        style={
          shouldReduceMotion
            ? { opacity: 1 }
            : {
                rotateX,
                rotateZ,
                translateY,
                opacity: rawOpacity,
              }
        }
        className="transform-gpu will-change-transform [transform-style:preserve-3d]"
      >
        {/* Row 1: Glides forward (translateX) */}
        <motion.div className="flex flex-row-reverse space-x-reverse space-x-8 sm:space-x-10 mb-6 sm:mb-8">
          {firstRow.map((product) => (
            <ProductCard
              product={product}
              translate={shouldReduceMotion ? undefined : translateX}
              key={product.title}
            />
          ))}
        </motion.div>

        {/* Row 2: Glides opposite (translateXReverse) */}
        <motion.div className="flex flex-row mb-6 sm:mb-8 space-x-8 sm:space-x-10">
          {secondRow.map((product) => (
            <ProductCard
              product={product}
              translate={shouldReduceMotion ? undefined : translateXReverse}
              key={product.title}
            />
          ))}
        </motion.div>

        {/* Row 3: Glides forward (translateX) */}
        <motion.div className="flex flex-row-reverse space-x-reverse space-x-8 sm:space-x-10">
          {thirdRow.map((product) => (
            <ProductCard
              product={product}
              translate={shouldReduceMotion ? undefined : translateX}
              key={product.title}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export const Header = () => {
  return (
    <div className="max-w-7xl relative mx-auto pt-4 pb-8 md:pt-8 md:pb-10 px-4 w-full left-0 top-0 z-20">
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1 text-[11px] font-mono text-white/70 mb-4 backdrop-blur-md">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        <span>MULTIMODAL FORENSIC DOSSIERS · 15 EVIDENCE CHANNELS</span>
      </div>

      <h2 className="text-2xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.04em] text-white max-w-4xl leading-[1.08]">
        Evidence across every dimension.
      </h2>
      <p className="max-w-2xl text-xs sm:text-sm md:text-base mt-3 text-white/60 leading-relaxed font-normal">
        Veritas audits 15 parallel evidentiary modalities simultaneously. Scroll through
        our real-time forensic inspection telemetry — cross-referencing C2PA cryptographic container manifests,
        16kHz vocoder harmonics, and global wire registries.
      </p>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Telemetry Visual Renders for Veritas Custom Parallax Cards                */
/* -------------------------------------------------------------------------- */

function CardTelemetryGraphic({ type }: { type?: ParallaxProduct["visualType"] }) {
  switch (type) {
    case "spectrogram":
      return (
        <svg className="w-full h-full opacity-65" viewBox="0 0 400 240" fill="none">
          <path d="M0,120 Q50,40 100,120 T200,120 T300,80 T400,120" stroke="#4f7cff" strokeWidth="2" fill="none" />
          <path d="M0,130 Q60,180 120,130 T240,110 T360,160 T400,130" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
          <path d="M0,110 Q80,70 160,110 T320,140 T400,110" stroke="#a78bfa" strokeWidth="1" strokeOpacity="0.8" fill="none" />
          {/* Spectral Bars */}
          {Array.from({ length: 24 }).map((_, i) => (
            <rect
              key={i}
              x={16 + i * 16}
              y={140 - (Math.sin(i * 0.7) * 45 + 40)}
              width="6"
              height={Math.sin(i * 0.7) * 45 + 40}
              fill="#4f7cff"
              fillOpacity={0.25 + (i % 3) * 0.15}
              rx="2"
            />
          ))}
        </svg>
      );
    case "mesh":
      return (
        <svg className="w-full h-full opacity-60" viewBox="0 0 400 240" fill="none">
          {/* Facial Landmark Wireframe */}
          <circle cx="200" cy="115" r="75" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 4" />
          <ellipse cx="200" cy="120" rx="45" ry="60" stroke="#38bdf8" strokeWidth="1" />
          <line x1="160" y1="100" x2="240" y2="100" stroke="#38bdf8" strokeWidth="1.5" />
          <line x1="200" y1="60" x2="200" y2="175" stroke="#38bdf8" strokeWidth="1.5" />
          {/* Landmark Vertices */}
          {[[165, 95], [190, 95], [210, 95], [235, 95], [200, 125], [180, 150], [200, 155], [220, 150]].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="3" fill="#60a5fa" />
          ))}
          <path d="M170,148 Q200,165 230,148" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="2 2" />
        </svg>
      );
    case "manifest":
      return (
        <div className="w-full h-full p-6 font-mono text-[11px] text-white/50 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 text-[10px] text-white/40">
            <span>C2PA-JUMBF://VALIDATED</span>
            <span className="text-emerald-400">HMAC-SHA256</span>
          </div>
          <div className="space-y-1.5 my-auto text-white/60">
            <p className="text-white/80">{"claim_generator: 'Sony A7IV v2.01'"}</p>
            <p>{"signature_issuer: 'C2PA CA Root 2026'"}</p>
            <p className="truncate">{"assertion: urn:c2pa:action.captured"}</p>
            <p className="text-emerald-400/90 font-semibold">{"state: TAMPER_FREE_HARDWARE_ATTESTED"}</p>
          </div>
          <div className="pt-2 border-t border-white/10 flex justify-between text-[10px] text-white/30">
            <span>BLOCK #992140</span>
            <span>ROOT CERTIFIED</span>
          </div>
        </div>
      );
    case "wire":
      return (
        <div className="w-full h-full p-6 font-mono text-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-white/40 pb-2 border-b border-white/10">
            <span>PRESS WIRE AGGREGATOR</span>
            <span className="text-sky-400 font-semibold">LIVE REUTERS & AP</span>
          </div>
          <div className="my-auto space-y-2">
            <div className="p-2 rounded bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-white/30">[00.08m ago] </span>
              <span className="text-white/80 font-sans text-xs">Direct correspondent corroboration filed in plenary session.</span>
            </div>
            <div className="p-2 rounded bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-white/30">[00.14m ago] </span>
              <span className="text-white/80 font-sans text-xs">Associated Press wire confirmed identical transcript.</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-emerald-400">
            <span>100% WIRE AGREEMENT</span>
            <span>CONSENSUS MATCH</span>
          </div>
        </div>
      );
    case "bootstrap":
      return (
        <svg className="w-full h-full opacity-70" viewBox="0 0 400 240" fill="none">
          {/* Gaussian Density Curve */}
          <path
            d="M20,200 C80,200 120,180 160,100 C180,60 200,40 220,60 C240,100 280,180 380,200"
            stroke="#60a5fa"
            strokeWidth="2.5"
            fill="none"
          />
          {/* 95% Confidence Band Shading */}
          <path
            d="M130,200 C150,140 170,80 200,40 C230,80 250,140 270,200 Z"
            fill="#3b82f6"
            fillOpacity="0.2"
          />
          <line x1="200" y1="35" x2="200" y2="205" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="130" y1="200" x2="130" y2="175" stroke="#ffffff" strokeWidth="1.5" />
          <line x1="270" y1="200" x2="270" y2="175" stroke="#ffffff" strokeWidth="1.5" />
          <text x="200" y="225" textAnchor="middle" fill="#ffffff" fillOpacity="0.6" fontSize="10" fontFamily="monospace">
            95% BOOTSTRAP CI: [0.08, 0.22]
          </text>
        </svg>
      );
    default:
      return (
        <div className="w-full h-full p-6 flex flex-col justify-between font-mono">
          <div className="flex items-center justify-between text-[10px] text-white/40 pb-2 border-b border-white/10">
            <span>AUDIT TELEMETRY STREAM</span>
            <span className="text-accent font-semibold">SIGNAL ACTIVE</span>
          </div>
          <div className="my-auto space-y-2">
            <div className="h-1.5 w-3/4 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full bg-accent w-4/5 rounded-full" />
            </div>
            <div className="h-1.5 w-1/2 rounded-full bg-white/10" />
            <div className="h-1.5 w-2/3 rounded-full bg-white/15" />
          </div>
          <div className="text-[10px] text-white/40 flex justify-between">
            <span>DEEP SENSOR PROBE</span>
            <span>LATENCY: 12.4ms</span>
          </div>
        </div>
      );
  }
}

export const ProductCard = ({
  product,
  translate,
}: {
  product: ParallaxProduct;
  translate?: MotionValue<number>;
}) => {
  const statusColor =
    product.statusVariant === "danger"
      ? "text-rose-400 border-rose-500/30 bg-rose-500/10"
      : product.statusVariant === "warning"
        ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
        : product.statusVariant === "success"
          ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
          : "text-white/70 border-white/15 bg-white/[0.04]";

  return (
    <motion.div
      style={translate ? { x: translate } : undefined}
      whileHover={{
        y: -12,
        transition: { duration: 0.25, ease: "easeOut" },
      }}
      key={product.title}
      className="group/product h-[18rem] sm:h-[21rem] w-[20rem] sm:w-[25rem] md:w-[28rem] relative shrink-0 rounded-2xl border border-white/10 bg-[#090a0d] p-0.5 shadow-2xl transition-[border-color,box-shadow] duration-200 hover:border-white/30 hover:shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden transform-gpu will-change-transform [backface-visibility:hidden] [contain:paint_layout]"
    >
      <Link
        href={product.link || "#"}
        className="block h-full w-full relative rounded-[14px] overflow-hidden bg-[#060709]"
      >
        {/* Background Visual: Either Veritas custom telemetry graphic or image thumbnail */}
        {product.visualType ? (
          <div className="absolute inset-0 bg-[#050608] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03)_0%,transparent_80%)]" />
            <CardTelemetryGraphic type={product.visualType} />
          </div>
        ) : product.thumbnail ? (
          // Standard Aceternity UI Image Thumbnail
          <Image
            src={product.thumbnail}
            height={600}
            width={600}
            className="object-cover object-left-top absolute h-full w-full inset-0 transition-transform duration-500 group-hover/product:scale-105"
            alt={product.title}
            unoptimized={product.thumbnail.startsWith("http")}
          />
        ) : (
          <div className="absolute inset-0 bg-[#050608] flex items-center justify-center">
            <CardTelemetryGraphic type="waveform" />
          </div>
        )}

        {/* Ambient Top Scan Grid & Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-[#050608]/40 to-transparent pointer-events-none" />

        {/* Top Header Strip */}
        <div className="absolute top-4 inset-x-4 flex items-center justify-between gap-2 z-10 font-mono text-[10px]">
          {product.category ? (
            <span className="px-2.5 py-1 rounded border border-white/10 bg-black/80 text-white/70">
              {product.category}
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded border border-white/10 bg-black/80 text-white/50">
              VERITAS DOSSIER
            </span>
          )}

          {product.status && (
            <span className={cn("px-2.5 py-1 rounded border font-semibold", statusColor)}>
              {product.status}
            </span>
          )}
        </div>

        {/* Bottom Title & Summary */}
        <div className="absolute bottom-0 inset-x-0 p-5 sm:p-6 z-10 transition-transform duration-300">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-base sm:text-lg font-semibold tracking-tight text-white drop-shadow-md">
              {product.title}
            </h3>
            {product.metric && (
              <span className="font-mono text-xs font-semibold text-emerald-400 shrink-0">
                {product.metric}
              </span>
            )}
          </div>

          {product.detail && (
            <p className="mt-1.5 text-xs text-white/60 line-clamp-2 leading-relaxed">
              {product.detail}
            </p>
          )}

          {product.confidence && (
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between font-mono text-[10px] text-white/40">
              <span>{product.tag ?? "EVIDENTIARY AUDIT"}</span>
              <span className="text-white/80 font-medium">{product.confidence}</span>
            </div>
          )}
        </div>

        {/* Subtle Hover Spotlight Overlay */}
        <div className="absolute inset-0 h-full w-full opacity-0 group-hover/product:opacity-100 bg-gradient-to-b from-accent/10 via-transparent to-black/80 pointer-events-none transition-opacity duration-300" />
      </Link>
    </motion.div>
  );
};
