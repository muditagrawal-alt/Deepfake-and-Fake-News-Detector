import type { Metadata } from "next";
import About from "../about/page";

export const metadata: Metadata = {
  title: "Methodology & Technical Approach — Veritas",
  description:
    "Veritas combines measured file details, neural claim decomposition, and independent primary wire evidence. Sources and limitations stay visible alongside the assessment.",
};

export default function MethodologyPage() {
  return <About />;
}
