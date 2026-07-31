import { useEffect, useRef } from "react";

/**
 * Intersection Observer hook that adds a CSS class when elements scroll into view.
 * Apply `ref` to a container — all direct children with `data-reveal` get animated.
 * Or apply `ref` to a single element to reveal itself.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options?: { threshold?: number; rootMargin?: string; once?: boolean }
) {
  const ref = useRef<T>(null);
  const { threshold = 0.12, rootMargin = "0px 0px -40px 0px", once = true } = options ?? {};

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced-motion preference
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            if (once) observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin }
    );

    // If the element has data-reveal, observe itself; otherwise observe children
    const targets = el.hasAttribute("data-reveal")
      ? [el]
      : el.querySelectorAll("[data-reveal]");

    if (targets.length === 0) {
      // Fallback: observe the element itself
      el.setAttribute("data-reveal", "");
      observer.observe(el);
    } else {
      targets.forEach((t) => observer.observe(t));
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return ref;
}
