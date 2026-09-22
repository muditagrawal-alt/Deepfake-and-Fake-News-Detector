"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

import { useScrollMotion } from "@/lib/useScrollMotion";

/**
 * The checker rises into place as the intro finishes receding, so the two read
 * as one continuous movement rather than two separate screens.
 */
export default function CheckSection({ children }: { children: React.ReactNode }) {
  const { ready } = useScrollMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.55"] });

  const y = useTransform(scrollYProgress, [0, 1], ["5vh", "0vh"]);
  const opacity = useTransform(scrollYProgress, [0.15, 0.75], [0.15, 1]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.985, 1]);

  return (
    <section
      ref={ref}
      id="check"
      className="relative z-10 border-t border-line bg-bg scroll-mt-14"
    >
      <motion.div
        style={ready ? { y, opacity, scale } : undefined}
        className="mx-auto max-w-5xl px-4 pt-14 pb-20 will-change-transform"
      >
        {children}
      </motion.div>
    </section>
  );
}
