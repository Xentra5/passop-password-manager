import { useEffect, useRef } from "react";

/**
 * useSmoothScroll — Lenis-powered smooth scrolling integration.
 *
 * - Initializes a single Lenis instance globally.
 * - Fully disabled when prefers-reduced-motion is active.
 * - Preserves anchor navigation (#features, #cipher-sandbox, etc.).
 * - Syncs Lenis RAF loop with requestAnimationFrame.
 * - Disposes cleanly on unmount.
 */
export function useSmoothScroll() {
  const lenisRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    // Respect accessibility preference
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) return;

    let Lenis;
    let destroyed = false;

    const init = async () => {
      try {
        const mod = await import("lenis");
        Lenis = mod.default || mod.Lenis;

        if (destroyed) return;

        const lenis = new Lenis({
          duration: 1.1,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smooth: true,
          smoothTouch: false, // native on mobile
          touchMultiplier: 2,
        });

        lenisRef.current = lenis;

        // Handle anchor <a href="#..."> navigation properly
        document.querySelectorAll("a[href^='#']").forEach((anchor) => {
          anchor.addEventListener("click", (e) => {
            const target = document.querySelector(anchor.getAttribute("href"));
            if (target) {
              e.preventDefault();
              lenis.scrollTo(target, { offset: -80 });
            }
          });
        });

        const raf = (time) => {
          lenis.raf(time);
          rafRef.current = requestAnimationFrame(raf);
        };

        rafRef.current = requestAnimationFrame(raf);
      } catch (err) {
        // Lenis failed to load — no smooth scroll but page still works
        console.warn("[useSmoothScroll] Lenis failed to initialize:", err);
      }
    };

    init();

    return () => {
      destroyed = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
      }
    };
  }, []);

  return lenisRef;
}
