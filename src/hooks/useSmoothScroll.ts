import { useEffect } from "react";

/**
 * Premium, weighted smooth scrolling for the main page scroller.
 *
 * This app scrolls `document.body` (fixed-height wrapper with overflow-y:auto),
 * not the window — so we lerp `scroller.scrollTop` toward a wheel-driven target
 * for an inertial, "heavy glass" feel.
 *
 * Deliberately conservative so it never fights the rest of the UI:
 *  - Desktop pointer only — touch devices keep their native momentum (protects
 *    the map homepage, the draggable mobile sheet, iOS/Android scrolling).
 *  - Disabled when the user prefers reduced motion.
 *  - Inner-scroller aware — if the wheel is over an element that can still scroll
 *    in that direction (admin/dashboard panels, modals, dropdowns, catalogues),
 *    we bail and let the browser handle it natively.
 */
export function useSmoothScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)");

    let scroller: HTMLElement | null = null;
    let target = 0;
    let current = 0;
    let raf = 0;
    let animating = false;
    const EASE = 0.11;

    const pickScroller = (): HTMLElement => {
      const b = document.body;
      const h = document.documentElement;
      return b.scrollHeight - b.clientHeight > h.scrollHeight - h.clientHeight ? b : h;
    };

    // Does an ancestor of `el` (below the main scroller) still scroll in dir `dy`?
    const innerCanScroll = (el: EventTarget | null, dy: number): boolean => {
      let node = el as HTMLElement | null;
      while (node && node !== scroller && node !== document.body && node !== document.documentElement) {
        const s = getComputedStyle(node);
        if ((s.overflowY === "auto" || s.overflowY === "scroll") && node.scrollHeight > node.clientHeight + 1) {
          const atTop = node.scrollTop <= 0;
          const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
          if ((dy < 0 && !atTop) || (dy > 0 && !atBottom)) return true;
        }
        node = node.parentElement;
      }
      return false;
    };

    const step = () => {
      if (!scroller) return;
      current += (target - current) * EASE;
      if (Math.abs(target - current) < 0.4) {
        current = target;
        scroller.scrollTop = current;
        animating = false;
        return;
      }
      scroller.scrollTop = current;
      raf = requestAnimationFrame(step);
    };

    const onWheel = (e: WheelEvent) => {
      if (!scroller) return;
      if (e.ctrlKey || e.defaultPrevented) return; // pinch-zoom / handled elsewhere
      if (e.deltaMode !== 0) return; // line/page deltas — leave native
      // Horizontal-dominant gestures are trackpad swipe navigation (back /
      // forward, i.e. "previous page") on macOS and Windows — never hijack them.
      if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      if (innerCanScroll(e.target, e.deltaY)) return;
      const max = scroller.scrollHeight - scroller.clientHeight;
      if (max <= 0) return;
      e.preventDefault();
      if (!animating) { current = scroller.scrollTop; target = current; }
      target = Math.max(0, Math.min(max, target + e.deltaY));
      if (!animating) { animating = true; raf = requestAnimationFrame(step); }
    };

    // Keep our target in sync with any non-wheel scroll (keyboard, scrollbar, route reset).
    const onScroll = () => { if (!animating && scroller) target = current = scroller.scrollTop; };

    let attached = false;
    const attach = () => {
      if (attached || reduce.matches || coarse.matches) return;
      scroller = pickScroller();
      scroller.style.scrollBehavior = "auto"; // don't let CSS smooth fight the rAF
      target = current = scroller.scrollTop;
      window.addEventListener("wheel", onWheel, { passive: false });
      scroller.addEventListener("scroll", onScroll, { passive: true });
      attached = true;
    };
    const detach = () => {
      if (!attached) return;
      window.removeEventListener("wheel", onWheel);
      scroller?.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
      animating = false;
      attached = false;
    };

    attach();
    const onPref = () => { detach(); attach(); };
    reduce.addEventListener("change", onPref);
    coarse.addEventListener("change", onPref);

    return () => {
      detach();
      reduce.removeEventListener("change", onPref);
      coarse.removeEventListener("change", onPref);
    };
  }, []);
}
