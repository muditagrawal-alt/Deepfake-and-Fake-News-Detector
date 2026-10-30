"use client";

import { ArrowDownRight, ArrowRight } from "@phosphor-icons/react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import Analyzer from "@/components/Analyzer";

export default function Intro({ onContinue }: { onContinue?: () => void }) {
  const reduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const previewY = useTransform(scrollYProgress, [0, 1], [0, 28]);
  const previewOpacity = useTransform(scrollYProgress, [0, 0.95], [1, 0.72]);

  useEffect(() => {
    function showMethod() {
      document.getElementById("how-it-works")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }
    window.addEventListener("veritas:how-it-works", showMethod);
    return () => window.removeEventListener("veritas:how-it-works", showMethod);
  }, [reduceMotion]);

  return (
    <div data-app-stage="landing" className="overflow-hidden">
      <section ref={heroRef} className="landing-hero relative isolate px-4 pb-20 pt-10 sm:pb-24 sm:pt-16 lg:pb-28 lg:pt-20">
        <div className="mx-auto grid w-full max-w-[1320px] items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <div className="relative z-[1] max-w-[570px]">
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.42 }}
              className="mb-6 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-3"
            >
              <span className="h-px w-8 bg-accent" /> A source-aware media check
            </motion.p>

            <motion.h1
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.62, delay: reduceMotion ? 0 : 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-[11ch] text-[clamp(3.5rem,7.2vw,6.8rem)] font-medium leading-[0.92] tracking-[-0.075em] text-pretty"
            >
              Look closer.<br /><span className="font-semibold text-accent">Know why.</span>
            </motion.h1>

            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : 0.16 }}
              className="mt-6 max-w-[48ch] text-[16px] leading-[1.75] text-ink-2 sm:text-[17px]"
            >
              Compare file facts, model analysis and independent sources for an article, image or video.
            </motion.p>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.48, delay: reduceMotion ? 0 : 0.24 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <motion.button
                type="button"
                onClick={onContinue}
                whileHover={reduceMotion ? undefined : { y: -2, boxShadow: "0 14px 28px -15px rgb(35 80 143 / 0.58)" }}
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                className="group inline-flex items-center gap-3 rounded-control bg-accent px-5 py-3.5 text-sm font-semibold text-accent-ink shadow-[0_8px_24px_-18px_rgba(35,80,143,.7)] transition-colors hover:bg-[#1b4279]"
              >
                Start a check <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" aria-hidden />
              </motion.button>
              <motion.button
                type="button"
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" })}
                whileHover={reduceMotion ? undefined : { x: 2 }}
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                className="inline-flex items-center gap-2 rounded-control px-4 py-3.5 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
              >
                How it works <ArrowDownRight size={17} aria-hidden />
              </motion.button>
            </motion.div>
          </div>

          <motion.div style={reduceMotion ? undefined : { y: previewY, opacity: previewOpacity }} className="relative lg:-mr-8">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 20, rotate: 0.7 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.72, delay: reduceMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="landing-preview relative rounded-[1.1rem] border border-line bg-elev p-3 shadow-[0_28px_80px_-42px_rgba(28,25,23,.38)] sm:p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <span className="text-xs font-medium text-ink-2">Try the analyzer</span>
                <span className="text-[10px] text-ink-3">Same controls as the workspace</span>
              </div>
              <Analyzer preview />
              <p className="px-1 pt-3 text-[10px] leading-relaxed text-ink-3">Preview only. Sign in to submit a check and see its evidence.</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 border-t border-line bg-elev px-4 py-20 sm:py-24 lg:py-28">
        <div className="mx-auto grid max-w-[1320px] gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-24">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: reduceMotion ? 0 : 0.52 }}
            className="lg:sticky lg:top-28 lg:h-fit"
          >
            <h2 className="max-w-[11ch] text-4xl font-medium leading-[1.02] tracking-[-0.06em] sm:text-5xl">A verdict should show its work.</h2>
            <p className="mt-5 max-w-[40ch] text-sm leading-[1.75] text-ink-2">No single signal settles a question. Veritas puts the source, file details and outside evidence beside the model’s reading.</p>
          </motion.div>

          <div className="border-t border-line">
            {[
              ["Read what arrived", "Extract the article or inspect the uploaded file, available metadata and the claim that came with it."],
              ["Look beyond the source", "Search for independent pages related to checkable claims and keep returned sources attached to the review."],
              ["Explain the uncertainty", "See the model’s judgment beside its evidence and caveats. Treat confidence as an estimate, not proof."],
            ].map(([title, description], index) => (
              <motion.article
                key={title}
                initial={reduceMotion ? false : { opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : index * 0.075 }}
                className="group grid gap-3 border-b border-line py-7 sm:grid-cols-[1fr_1.15fr] sm:gap-8 sm:py-9"
              >
                <h3 className="text-xl font-medium tracking-[-0.035em] transition-transform group-hover:translate-x-1 sm:text-2xl">{title}</h3>
                <p className="max-w-[54ch] text-sm leading-[1.75] text-ink-2">{description}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:py-24 lg:py-28">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: reduceMotion ? 0 : 0.55 }}
          className="mx-auto grid max-w-[1320px] items-end gap-7 border-b border-line pb-10 sm:grid-cols-[1fr_auto] sm:pb-12"
        >
          <div>
            <h2 className="max-w-[12ch] text-4xl font-medium leading-[1.02] tracking-[-0.06em] sm:text-6xl">Start with what you have.</h2>
            <p className="mt-4 max-w-[54ch] text-sm leading-[1.75] text-ink-2">Begin with the item in front of you. Keep sources, reasoning and limitations together.</p>
          </div>
          <motion.button
            type="button"
            onClick={onContinue}
            whileHover={reduceMotion ? undefined : { x: 4 }}
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            className="group inline-flex h-12 items-center justify-center gap-3 justify-self-start rounded-control bg-ink px-5 text-sm font-medium text-bg transition-colors hover:bg-accent sm:justify-self-end"
          >
            Open Veritas <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" aria-hidden />
          </motion.button>
        </motion.div>
      </section>
    </div>
  );
}
