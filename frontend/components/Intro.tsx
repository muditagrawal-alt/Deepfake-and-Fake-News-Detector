"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef } from "react";

const WORD = "VERITAS";
const NOISE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CYCLE_MS = 55;       // how fast an unresolved letter changes
const STAGGER_MS = 105;    // delay between letters locking in
const LEAD_MS = 260;       // everything cycles together before the first letter locks
const TOTAL_MS = LEAD_MS + WORD.length * STAGGER_MS;

/**
 * The wordmark resolves out of noise: the product's job is turning
 * ambiguous material into a settled answer, so the name does the same.
 */
function useScramble(enabled: boolean) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!enabled) { el.textContent = WORD; return; }

    let frame = 0;
    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      // Every slot is filled from the first frame, so the wordmark never
      // reflows: letters lock in left to right out of the noise.
      const step = Math.floor(elapsed / CYCLE_MS);
      let out = "";
      for (let i = 0; i < WORD.length; i++) {
        out += elapsed >= LEAD_MS + i * STAGGER_MS
          ? WORD[i]
          : NOISE[(step * 7 + i * 13) % NOISE.length];
      }
      el.textContent = out;
      frame++;
      if (elapsed < TOTAL_MS) raf = requestAnimationFrame(tick);
      else el.textContent = WORD;
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  return ref;
}

export default function Intro() {
  const reduce = useReducedMotion();
  const wordRef = useScramble(!reduce);
  const sectionRef = useRef<HTMLDivElement>(null);

  // The tool section scrolls up over the intro; the intro recedes rather than
  // just disappearing. Driven by motion values, so no re-render per frame.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const opacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);
  const lift = useTransform(scrollYProgress, [0, 1], [0, -40]);

  const stage = reduce
    ? {}
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };
  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <div ref={sectionRef} className="relative h-[100dvh]">
      <motion.div
        style={reduce ? undefined : { opacity, scale, y: lift }}
        className="sticky top-0 h-[100dvh] flex flex-col justify-center px-4"
      >
        <div className="mx-auto w-full max-w-5xl">
          <h1 className="font-mono text-[15vw] sm:text-[12vw] lg:text-[9.5rem] leading-[0.95] font-semibold tracking-[-0.03em] select-none">
            <span ref={wordRef} aria-hidden>{WORD}</span>
            <span className="sr-only">Veritas</span>
          </h1>

          {/* The sweep reads as a verification pass over the name. */}
          <motion.div
            aria-hidden
            initial={reduce ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.9, delay: 1.0, ease }}
            className="mt-6 h-px origin-left bg-line-strong"
          />

          <motion.p
            {...stage}
            transition={{ duration: 0.7, delay: 1.2, ease }}
            className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-ink-2"
          >
            Latin for truth. Here, a check on whether a news link, an image or a short video is what it claims to be.
          </motion.p>

          <motion.div {...stage} transition={{ duration: 0.7, delay: 1.4, ease }} className="mt-8">
            <a
              href="#check"
              className="inline-flex rounded-control bg-accent px-5 py-3 text-sm font-semibold text-accent-ink transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]"
            >
              Run a check
            </a>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
