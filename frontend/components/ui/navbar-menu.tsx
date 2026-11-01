"use client";
import React from "react";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
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
  href,
  onClick,
  isHighlighted = false,
  children,
}: {
  setActive: (item: string | null) => void;
  active: string | null;
  item: string;
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  isHighlighted?: boolean;
  children?: React.ReactNode;
}) => {
  const reduceMotion = useReducedMotion();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    setActive(null);
    if (onClick) {
      onClick(e);
    }
  };

  const label = (
    <motion.span
      transition={{ duration: 0.2 }}
      className={cn(
        "inline-block cursor-pointer text-sm font-medium transition-all select-none px-3 py-1 rounded-full",
        isHighlighted
          ? "text-white bg-white/15 shadow-[0_0_14px_rgba(56,189,248,0.35)] ring-1 ring-cyan-400/40 font-semibold"
          : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"
      )}
    >
      {item}
    </motion.span>
  );

  return (
    <div onMouseEnter={() => setActive(item)} className="relative">
      {href ? (
        <a
          href={href}
          onClick={handleClick}
          className="block outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 rounded-full"
        >
          {label}
        </a>
      ) : (
        label
      )}
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
            <div className="absolute top-[calc(100%_+_1.2rem)] left-1/2 transform -translate-x-1/2 pt-4 z-50">
              <motion.div
                transition={reduceMotion ? { duration: 0 } : transition}
                layoutId="active" // layoutId ensures smooth animation
                className="bg-white/95 dark:bg-[#07070a]/95 backdrop-blur-2xl rounded-2xl overflow-hidden border border-black/10 dark:border-white/15 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.85)] ring-1 ring-white/5"
              >
                {/* Ambient specular highlight rim */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"
                />
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
  visual,
  onClick,
}: {
  title: string;
  description: string;
  href: string;
  src?: string;
  visual?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) => {
  return (
    <a
      href={href}
      onClick={onClick}
      className="flex space-x-3 group/product rounded-xl p-2.5 transition-colors hover:bg-neutral-100 dark:hover:bg-white/[0.06] border border-transparent hover:border-white/10"
    >
      {visual ? (
        visual
      ) : src ? (
        <Image
          src={src}
          width={140}
          height={70}
          alt={title}
          className="shrink-0 rounded-lg shadow-md object-cover border border-black/5 dark:border-white/10 w-[110px] h-[64px]"
          unoptimized={src.startsWith("http")}
        />
      ) : null}
      <div className="flex flex-col justify-center min-w-0">
        <h4 className="text-sm font-semibold mb-1 text-black dark:text-white group-hover/product:text-accent transition-colors flex items-center gap-1.5">
          {title}
        </h4>
        <p className="text-neutral-600 dark:text-neutral-400 text-xs max-w-[14rem] leading-snug">
          {description}
        </p>
      </div>
    </a>
  );
};

export const HoveredLink = ({
  children,
  className,
  description,
  step,
  ...rest
}: {
  description?: string;
  step?: string;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
  return (
    <a
      {...rest}
      className={cn(
        "group/link flex items-start gap-2.5 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-all text-sm px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/[0.06]",
        className
      )}
    >
      {step && (
        <span className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-neutral-400 group-hover/link:text-white group-hover/link:bg-white/20 transition-colors">
          {step}
        </span>
      )}
      <div className="flex flex-col">
        <span className="font-medium text-ink group-hover/link:text-white transition-colors">
          {children}
        </span>
        {description && (
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-snug">
            {description}
          </span>
        )}
      </div>
    </a>
  );
};
