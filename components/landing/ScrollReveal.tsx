"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { EASE } from "@/components/ui/styles";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  from?: "up" | "left" | "right";
}

const HIDDEN = {
  up: "translate-y-6",
  left: "-translate-x-8",
  right: "translate-x-8",
};

export default function ScrollReveal({
  children,
  className = "",
  delayMs = 0,
  from = "up",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-visible={isVisible || undefined}
      style={{
        transitionDelay: `${delayMs}ms`,
      }}
      className={`group/reveal transition-[opacity,translate] duration-700 ${EASE} motion-reduce:transition-opacity ${
        isVisible ? "opacity-100 translate-0" : `opacity-0 ${HIDDEN[from]} motion-reduce:translate-0`
      } ${className}`}
    >
      {children}
    </div>
  );
}
