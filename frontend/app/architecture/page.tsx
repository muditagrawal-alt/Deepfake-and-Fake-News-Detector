import type { Metadata } from "next";
import { Architecture3D } from "@/components/Architecture3D";

export const metadata: Metadata = {
  title: "Live Forensic Pipeline Architecture — Veritas",
  description:
    "Interactive dynamic execution chart demonstrating Veritas's multi-stage forensic analysis lifecycle from raw multimodal ingestion to calibrated Bayesian synthesis.",
};

export default function ArchitecturePage() {
  return (
    <main>
      <Architecture3D />
    </main>
  );
}

