"use client";

import React from "react";

export function TriangulationThumbnail() {
  return (
    <div className="relative w-[110px] h-[64px] rounded-lg overflow-hidden border border-white/10 bg-[#08080c] flex items-center justify-center shrink-0 shadow-inner group-hover/product:border-accent/40 transition-colors">
      <svg className="w-full h-full p-1.5" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Subtle background radar circles */}
        <circle cx="50" cy="30" r="26" stroke="#222" strokeWidth="0.8" strokeDasharray="2 2" />
        <circle cx="50" cy="30" r="16" stroke="#1f2937" strokeWidth="0.8" />
        {/* Triangulation vectors */}
        <polygon points="50,10 78,44 22,44" stroke="#3b82f6" strokeWidth="1.2" strokeOpacity="0.6" fill="#3b82f6" fillOpacity="0.08" />
        {/* Nodes */}
        <circle cx="50" cy="10" r="2.5" fill="#60a5fa" />
        <circle cx="78" cy="44" r="2.5" fill="#34d399" />
        <circle cx="22" cy="44" r="2.5" fill="#f59e0b" />
        {/* Center Target Media Node */}
        <circle cx="50" cy="30" r="3.5" fill="#fff" />
        <circle cx="50" cy="30" r="6" stroke="#60a5fa" strokeWidth="0.8" className="animate-ping" style={{ transformOrigin: "50px 30px", animationDuration: "3s" }} />
      </svg>
      <div className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/70 border border-white/10 text-[8px] font-mono text-blue-400">
        TRI-3
      </div>
    </div>
  );
}

export function AudioSpectrogramThumbnail() {
  return (
    <div className="relative w-[110px] h-[64px] rounded-lg overflow-hidden border border-white/10 bg-[#08080c] flex items-center justify-center shrink-0 shadow-inner group-hover/product:border-accent/40 transition-colors">
      <svg className="w-full h-full p-2" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Audio Spectrogram bars */}
        <rect x="8" y="24" width="4" height="20" rx="2" fill="#818cf8" opacity="0.7" />
        <rect x="16" y="16" width="4" height="32" rx="2" fill="#a78bfa" opacity="0.85" />
        <rect x="24" y="28" width="4" height="16" rx="2" fill="#6366f1" opacity="0.6" />
        <rect x="32" y="12" width="4" height="38" rx="2" fill="#c084fc" />
        <rect x="40" y="20" width="4" height="26" rx="2" fill="#818cf8" opacity="0.75" />
        <rect x="48" y="8" width="4" height="44" rx="2" fill="#38bdf8" />
        <rect x="56" y="22" width="4" height="24" rx="2" fill="#60a5fa" opacity="0.8" />
        <rect x="64" y="14" width="4" height="34" rx="2" fill="#a855f7" />
        <rect x="72" y="26" width="4" height="18" rx="2" fill="#818cf8" opacity="0.65" />
        <rect x="80" y="18" width="4" height="28" rx="2" fill="#38bdf8" opacity="0.8" />
        <rect x="88" y="30" width="4" height="12" rx="2" fill="#6366f1" opacity="0.5" />
        {/* Pitch contour wave */}
        <path d="M 6 40 Q 25 15 45 35 T 85 20 T 96 35" stroke="#f43f5e" strokeWidth="1.2" fill="none" strokeDasharray="3 1.5" />
      </svg>
      <div className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/70 border border-white/10 text-[8px] font-mono text-cyan-400">
        VOICE
      </div>
    </div>
  );
}

export function MicroSaccadeThumbnail() {
  return (
    <div className="relative w-[110px] h-[64px] rounded-lg overflow-hidden border border-white/10 bg-[#08080c] flex items-center justify-center shrink-0 shadow-inner group-hover/product:border-accent/40 transition-colors">
      <svg className="w-full h-full p-2" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Face contour outline */}
        <path d="M 28 20 C 35 12, 65 12, 72 20 C 78 30, 72 48, 50 54 C 28 48, 22 30, 28 20 Z" stroke="#334155" strokeWidth="1" fill="#0f172a" fillOpacity="0.3" />
        {/* Eye landmarks */}
        <ellipse cx="40" cy="27" rx="6" ry="4" stroke="#38bdf8" strokeWidth="1" />
        <circle cx="40" cy="27" r="2" fill="#38bdf8" />
        <ellipse cx="60" cy="27" rx="6" ry="4" stroke="#38bdf8" strokeWidth="1" />
        <circle cx="60" cy="27" r="2" fill="#38bdf8" />
        {/* Saccade vectors */}
        <line x1="40" y1="27" x2="36" y2="23" stroke="#f43f5e" strokeWidth="1.2" />
        <circle cx="36" cy="23" r="1.5" fill="#f43f5e" />
        <line x1="60" y1="27" x2="64" y2="24" stroke="#f43f5e" strokeWidth="1.2" />
        <circle cx="64" cy="24" r="1.5" fill="#f43f5e" />
        {/* Landmark crosshairs */}
        <path d="M 50 34 L 47 40 L 53 40 Z" stroke="#475569" strokeWidth="0.8" fill="none" />
        <path d="M 42 46 Q 50 50 58 46" stroke="#475569" strokeWidth="0.8" fill="none" />
      </svg>
      <div className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/70 border border-white/10 text-[8px] font-mono text-rose-400">
        VISION
      </div>
    </div>
  );
}

export function C2paThumbnail() {
  return (
    <div className="relative w-[110px] h-[64px] rounded-lg overflow-hidden border border-white/10 bg-[#08080c] flex items-center justify-center shrink-0 shadow-inner group-hover/product:border-accent/40 transition-colors">
      <svg className="w-full h-full p-2" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Cryptographic Shield */}
        <path d="M 50 10 L 68 18 C 68 34, 56 46, 50 50 C 44 46, 32 34, 32 18 Z" stroke="#10b981" strokeWidth="1.2" fill="#064e3b" fillOpacity="0.25" />
        {/* Checkmark inside shield */}
        <path d="M 44 28 L 48 33 L 57 23" stroke="#34d399" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        {/* Connected ledger blocks */}
        <rect x="12" y="24" width="12" height="12" rx="2" stroke="#475569" strokeWidth="0.8" fill="#1e293b" fillOpacity="0.4" />
        <line x1="24" y1="30" x2="32" y2="30" stroke="#10b981" strokeWidth="1" strokeDasharray="2 1" />
        <rect x="76" y="24" width="12" height="12" rx="2" stroke="#475569" strokeWidth="0.8" fill="#1e293b" fillOpacity="0.4" />
        <line x1="68" y1="30" x2="76" y2="30" stroke="#10b981" strokeWidth="1" strokeDasharray="2 1" />
      </svg>
      <div className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/70 border border-white/10 text-[8px] font-mono text-emerald-400">
        C2PA
      </div>
    </div>
  );
}

