"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  sequential?: boolean;
  revealDirection?: "start" | "end" | "center";
  useOriginalCharsOnly?: boolean;
  characters?: string;
  className?: string;
  encryptedClassName?: string;
  parentClassName?: string;
  animateOn?: "hover" | "view";
}

export function DecryptedText({
  text,
  speed = 40,
  maxIterations = 10,
  sequential = true,
  characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~|}{[]:;?><",
  className = "",
  encryptedClassName = "text-ink-3",
  parentClassName = "",
  animateOn = "hover",
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isScrambling, setIsScrambling] = useState(false);
  const iterationRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startScramble = useCallback(() => {
    setIsScrambling(true);
    iterationRef.current = 0;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setDisplayText(() => {
        return text
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            if (sequential) {
              if (index < iterationRef.current) {
                return text[index];
              }
            } else {
              if (iterationRef.current >= maxIterations) {
                return text[index];
              }
            }
            return characters[Math.floor(Math.random() * characters.length)];
          })
          .join("");
      });

      iterationRef.current += 1;

      if (iterationRef.current > (sequential ? text.length : maxIterations)) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setDisplayText(text);
        setIsScrambling(false);
      }
    }, speed);
  }, [text, speed, maxIterations, sequential, characters]);

  useEffect(() => {
    if (animateOn === "view") {
      const timer = setTimeout(() => {
        startScramble();
      }, 50);
      return () => {
        clearTimeout(timer);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [animateOn, startScramble]);

  const handleMouseEnter = () => {
    if (animateOn === "hover" && !isScrambling) {
      startScramble();
    }
  };

  return (
    <span
      className={cn("inline-block select-none", parentClassName)}
      onMouseEnter={handleMouseEnter}
    >
      <span className={cn(isScrambling ? encryptedClassName : className)}>
        {displayText}
      </span>
    </span>
  );
}
