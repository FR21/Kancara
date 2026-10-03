import { useEffect, useRef } from "react";

export function useInViewAttribute<T extends HTMLElement>(threshold = 0) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => element.toggleAttribute("data-in-view", entry.isIntersecting),
      { threshold },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  return ref;
}
