"use client";

import { useReducedMotion } from "motion/react";
import { useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};

/**
 * Scroll-linked styles must not be applied on the server or on the first
 * client render: the values differ between the two and React reports a
 * hydration mismatch that it explicitly does not patch up, which can leave an
 * element stuck at its start-of-animation style.
 *
 * Returns `ready` (true only after mount, and false when the user asks for
 * reduced motion) and the viewport height, updated on resize only.
 */
export function useScrollMotion() {
  const reduce = useReducedMotion();

  // useSyncExternalStore uses the server snapshot (0) during SSR and hydration,
  // then the real value. So vh > 0 doubles as "hydrated", with no state to set
  // from an effect.
  const vh = useSyncExternalStore(subscribe, () => window.innerHeight, () => 0);

  return { ready: vh > 0 && !reduce, vh, reduce };
}
