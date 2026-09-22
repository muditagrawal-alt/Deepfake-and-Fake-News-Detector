"use client";

import { MotionConfig } from "motion/react";

/**
 * `reducedMotion="user"` lets Motion honour the OS setting itself: transform
 * and layout animations are disabled, opacity is kept. Doing it here means
 * components never branch on the preference during render, which would diverge between the
 * server and the client markup and trigger a hydration mismatch.
 */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
