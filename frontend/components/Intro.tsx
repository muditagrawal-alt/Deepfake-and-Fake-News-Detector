"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef } from "react";

import { useScrollMotion } from "@/lib/useScrollMotion";

const WORD = "VERITAS";
const NOISE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CYCLE_MS = 55;       // how fast an unresolved letter changes
const STAGGER_MS = 105;    // delay between letters locking in
const LEAD_MS = 260;       // everything cycles together before the first letter locks
const TOTAL_MS = LEAD_MS + WORD.length * STAGGER_MS;
const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The wordmark resolves out of noise: the product's job is turning ambiguous
 * material into a settled answer, so the name does the same.
 */
function useScramble(enabled: boolean) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!enabled) { el.textContent = WORD; return; }

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
      if (elapsed < TOTAL_MS) raf = requestAnimationFrame(tick);
      else el.textContent = WORD;
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  return ref;
}

export default function Intro() {
  const { ready, vh, reduce } = useScrollMotion();
  // The scramble is a text effect, not a transform, so it is gated directly.
  const wordRef = useScramble(!reduce);

  // Driven by raw scroll position rather than element progress: the whole
  // transition plays over the first viewport of scrolling, which is exact and
  // cannot drift as the sticky stage moves. scrollY is a motion value, so
  // scrolling never re-renders React.
  const { scrollY } = useScroll();
  const span = vh || 1;
  const at = (f: number) => span * f;

  // The intro occupies exactly one viewport and scrolls away normally, so the
  // checker is always directly beneath it and no empty stage can appear.
  //
  // The whole block is held back against that scroll as one unit (parallax);
  // only opacity and scale differ between its parts. Parallaxing the elements
  // separately made them collide.
  const blockY = useTransform(scrollY, [0, at(1)], [0, span * 0.32]);
  const blockOpacity = useTransform(scrollY, [at(0.3), at(0.72)], [1, 0]);
  const blockFilter = useTransform(
    useTransform(scrollY, [at(0.3), at(0.72)], [0, 5]),
    (v) => `blur(${v}px)`,
  );
  const wordScale = useTransform(scrollY, [0, at(1)], [1, 0.88]);

  // The rule retracts to a stub as the block leaves. Its entry sweep lives on
  // the inner element so it never competes with this value.
  const ruleScale = useTransform(scrollY, [0, at(0.6)], [1, 0.2]);

  // Supporting copy thins out slightly ahead of the rest.
  const copyOpacity = useTransform(scrollY, [at(0.1), at(0.45)], [1, 0.15]);


  return (
    <div className="relative h-[100dvh] overflow-hidden">
      <div className="h-full flex flex-col justify-center px-4">
        <motion.div
          data-intro="block"
          style={!ready ? undefined : { y: blockY, opacity: blockOpacity, filter: blockFilter }}
          className="mx-auto w-full max-w-5xl will-change-transform"
        >
          <motion.h1
            data-intro="word"
            style={!ready ? undefined : { scale: wordScale }}
            className="origin-left font-mono text-[15vw] sm:text-[12vw] lg:text-[9.5rem] leading-[0.95] font-semibold tracking-[-0.03em] select-none will-change-transform"
          >
            <span ref={wordRef} aria-hidden>{WORD}</span>
            <span className="sr-only">Veritas</span>
          </motion.h1>

          {/* Outer element carries the scroll values, inner one the entry sweep. */}
          <motion.div
            data-intro="rule"
            aria-hidden
            style={!ready ? undefined : { scaleX: ruleScale }}
            className="mt-6 h-px origin-left"
          >
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.9, delay: 1.0, ease: EASE }}
              className="h-full w-full origin-left bg-line-strong"
            />
          </motion.div>

          <motion.div
            data-intro="copy"
            style={!ready ? undefined : { opacity: copyOpacity }}
            className="will-change-transform"
          >
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.2, ease: EASE }}
              className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-ink-2"
            >
              Latin for truth. Here, a check on whether a news link, an image or a short video is what it claims to be.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.4, ease: EASE }}
              className="mt-8"
            >
              <a
                href="#check"
                className="inline-flex rounded-control bg-accent px-5 py-3 text-sm font-semibold text-accent-ink transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]"
              >
                Run a check
              </a>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
