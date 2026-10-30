"use client";

import { motion, useInView, useReducedMotion, type UseInViewOptions } from "motion/react";
import { useMemo, useRef } from "react";

export interface BlurTextProps {
  text: string;
  delay?: number;
  className?: string;
  animateBy?: "words" | "letters";
  direction?: "top" | "bottom";
  threshold?: "some" | "all" | number;
  rootMargin?: UseInViewOptions["margin"];
  onAnimationComplete?: () => void;
}

export default function BlurText({
  text = "",
  delay = 70,
  className = "",
  animateBy = "words",
  direction = "top",
  threshold = "some",
  rootMargin = "-50px",
  onAnimationComplete,
}: BlurTextProps) {
  const elements = useMemo(() => {
    return animateBy === "words" ? text.split(" ") : text.split("");
  }, [text, animateBy]);

  const ref = useRef<HTMLParagraphElement>(null);
  const inView = useInView(ref, {
    once: true,
    amount: threshold,
    margin: rootMargin,
  });
  const reduceMotion = useReducedMotion();

  const defaultFrom =
    direction === "top"
      ? { filter: "blur(12px)", opacity: 0, y: -24 }
      : { filter: "blur(12px)", opacity: 0, y: 24 };

  const defaultTo = {
    filter: "blur(0px)",
    opacity: 1,
    y: 0,
  };

  return (
    <span
      ref={ref}
      className={`inline-flex flex-wrap items-center ${className}`}
    >
      {elements.map((segment, index) => (
        <motion.span
          key={`${segment}-${index}`}
          initial={reduceMotion ? false : defaultFrom}
          animate={inView || reduceMotion ? defaultTo : defaultFrom}
          transition={{
            duration: reduceMotion ? 0 : 0.65,
            delay: reduceMotion ? 0 : (index * delay) / 1000,
            ease: [0.16, 1, 0.3, 1],
          }}
          onAnimationComplete={
            index === elements.length - 1 ? onAnimationComplete : undefined
          }
          className="inline-block will-change-[transform,filter,opacity]"
        >
          {segment}
          {animateBy === "words" && index < elements.length - 1 && (
            <span className="inline-block">&nbsp;</span>
          )}
        </motion.span>
      ))}
    </span>
  );
}
