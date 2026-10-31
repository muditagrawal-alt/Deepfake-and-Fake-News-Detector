"use client";
import React from "react";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const transition = {
  type: "spring" as const,
  mass: 0.5,
  damping: 11.5,
  stiffness: 100,
  restDelta: 0.001,
  restSpeed: 0.001,
};

export const MenuItem = ({
  setActive,
  active,
  item,
  children,
}: {
  setActive: (item: string) => void;
  active: string | null;
  item: string;
  children?: React.ReactNode;
}) => {
  const reduceMotion = useReducedMotion();

  return (
    <div onMouseEnter={() => setActive(item)} className="relative">
      <motion.p
        transition={{ duration: 0.3 }}
        className="cursor-pointer text-ink-2 hover:text-white dark:text-neutral-200 dark:hover:text-white text-sm font-medium transition-colors"
      >
        {item}
      </motion.p>
      {active !== null && (
        <motion.div
          initial={
            reduceMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.85, y: 10 }
          }
          animate={
            reduceMotion
              ? { opacity: 1 }
              : { opacity: 1, scale: 1, y: 0 }
          }
          transition={reduceMotion ? { duration: 0 } : transition}
        >
          {active === item && (
            <div className="absolute top-[calc(100%_+_1.2rem)] left-1/2 transform -translate-x-1/2 pt-4">
              <motion.div
                transition={reduceMotion ? { duration: 0 } : transition}
                layoutId="active" // layoutId ensures smooth animation
                className="bg-white dark:bg-[#0a0a0c] backdrop-blur-xl rounded-2xl overflow-hidden border border-black/[0.1] dark:border-white/[0.15] shadow-2xl shadow-black/80"
              >
                <motion.div
                  layout // layout ensures smooth animation
                  className="w-max h-full p-4"
                >
                  {children}
                </motion.div>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export const Menu = ({
  setActive,
  children,
  className,
}: {
  setActive: (item: string | null) => void;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <nav
      onMouseLeave={() => setActive(null)} // resets the state
      className={cn(
        "relative rounded-full border border-line/60 bg-elev/80 dark:bg-black/80 backdrop-blur-md shadow-input flex justify-center items-center space-x-6 px-7 py-2.5",
        className
      )}
    >
      {children}
    </nav>
  );
};

export const ProductItem = ({
  title,
  description,
  href,
  src,
}: {
  title: string;
  description: string;
  href: string;
  src: string;
}) => {
  return (
    <a
      href={href}
      className="flex space-x-3 group/product rounded-xl p-2 transition-colors hover:bg-neutral-100 dark:hover:bg-white/5"
    >
      <Image
        src={src}
        width={140}
        height={70}
        alt={title}
        className="shrink-0 rounded-lg shadow-md object-cover border border-black/5 dark:border-white/10 w-[110px] h-[64px]"
        unoptimized={src.startsWith("http")}
      />
      <div className="flex flex-col justify-center">
        <h4 className="text-sm font-semibold mb-1 text-black dark:text-white group-hover/product:text-accent transition-colors">
          {title}
        </h4>
        <p className="text-neutral-600 dark:text-neutral-400 text-xs max-w-[13rem] leading-snug">
          {description}
        </p>
      </div>
    </a>
  );
};

export const HoveredLink = ({
  children,
  className,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
  return (
    <a
      {...rest}
      className={cn(
        "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors text-sm px-2.5 py-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-white/5",
        className
      )}
    >
      {children}
    </a>
  );
};
