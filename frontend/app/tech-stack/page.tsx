import type { Metadata } from "next";
import { TechStackShowcase } from "@/components/TechStackShowcase";

export const metadata: Metadata = {
  title: "Technologies & Engineering Stack — Veritas",
  description:
    "Explore the modern production architecture powering Veritas: Gemini 2.5 Flash Lite, Groq LLaMA-3.3, FastAPI, C2PA JUMBF, Next.js 16, React 19, Tailwind v4, Anime.js, and React Bits Pro.",
};

export default function TechStackPage() {
  return (
    <main>
      <TechStackShowcase />
    </main>
  );
}

