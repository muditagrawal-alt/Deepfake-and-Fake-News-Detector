"use client";

import React, { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "motion/react";
import { cn } from "@/lib/utils";

export interface ScrollStackProps {
  children: React.ReactNode;
  className?: string;
  itemScale?: number;
  itemStackDistance?: number;
  stackPosition?: number;
  useWindowScroll?: boolean;
}

export interface ScrollStackItemProps {
  children: React.ReactNode;
  className?: string;
  itemClassName?: string;
  index?: number;
  total?: number;
  itemStackDistance?: number;
  stackPosition?: number;
  itemScale?: number;
}

export function ScrollStackItem({
  children,
  className,
  itemClassName,
  index = 0,
  total = 1,
  itemStackDistance = 16,
  stackPosition = 100,
  itemScale = 0.025,
}: ScrollStackItemProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Track the card scroll progress through the window viewport
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start start", "end start"],
  });

  const scale = useTransform(
    scrollYProgress,
    [0, 1],
    [1, shouldReduceMotion ? 1 : Math.max(0.85, 1 - (total - index - 1) * itemScale)]
  );

  const opacity = useTransform(
    scrollYProgress,
    [0, 0.9, 1],
    [1, 0.85, 0.7]
  );

  return (
    <motion.div
      ref={cardRef}
      className={cn(
        "scroll-stack-card sticky w-full mb-20 sm:mb-28 last:mb-0 transition-shadow duration-300",
        className,
        itemClassName
      )}
      style={{
        top: `${stackPosition + index * itemStackDistance}px`,
        zIndex: index + 10,
        scale,
        opacity,
      }}
    >
      {children}
    </motion.div>
  );
}

export function ScrollStack({
  children,
  className,
  itemScale = 0.025,
  itemStackDistance = 16,
  stackPosition = 100,
  useWindowScroll = true,
}: ScrollStackProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const childrenArray = React.Children.toArray(children);
  const total = childrenArray.length;

  return (
    <div
      ref={containerRef}
      className={cn(
        "scroll-stack-container relative w-full",
        useWindowScroll ? "overflow-visible" : "overflow-y-auto max-h-[85vh]",
        className
      )}
    >
      <div className="scroll-stack-inner relative w-full max-w-4xl mx-auto">
        {React.Children.map(children, (child, index) => {
          if (!React.isValidElement(child)) return child;

          // If child is already a ScrollStackItem, clone with computed stack values
          if (child.type === ScrollStackItem) {
            return React.cloneElement(child as React.ReactElement<ScrollStackItemProps>, {
              index,
              total,
              itemStackDistance,
              stackPosition,
              itemScale,
            });
          }

          // Otherwise wrap child in a ScrollStackItem
          return (
            <ScrollStackItem
              key={index}
              index={index}
              total={total}
              itemStackDistance={itemStackDistance}
              stackPosition={stackPosition}
              itemScale={itemScale}
            >
              {child}
            </ScrollStackItem>
          );
        })}
      </div>
    </div>
  );
}

export default ScrollStack;
