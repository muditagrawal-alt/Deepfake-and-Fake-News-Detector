import type { Metadata } from "next";
import { Architecture3D } from "@/components/Architecture3D";

export const metadata: Metadata = {
  title: "System Architecture (3D Model) — Veritas",
  description:
    "Interactive 3D model of the Veritas multi-signal forensic verification pipeline rendered with Anime.js. Monolithic and exploded views with deep contract telemetry.",
};

export default function ArchitecturePage() {
  return (
    <main>
      <Architecture3D />
    </main>
  );
}

