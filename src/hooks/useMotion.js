import { useEffect, useRef, useState, useCallback } from "react";

/**
 * useSpotlight - High-performance cursor tracking for spotlight card effects
 * Updates CSS custom properties --mouse-x and --mouse-y using requestAnimationFrame
 * Zero component re-renders for fluid 120 FPS performance.
 */
export function useSpotlight() {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let rafId = null;

    const handleMouseMove = (e) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        el.style.setProperty("--mouse-x", `${x}px`);
        el.style.setProperty("--mouse-y", `${y}px`);
        // Enhanced: also track normalized position for reactive border
        el.style.setProperty("--mouse-nx", `${(x / rect.width) * 100}%`);
        el.style.setProperty("--mouse-ny", `${(y / rect.height) * 100}%`);
      });
    };

    el.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return containerRef;
}

/**
 * useTilt - 3D Perspective Tilt on Hover
 * Computes smooth rotateX, rotateY and specular light coordinate on mouse move.
 * Automatically disabled on touch screens and prefers-reduced-motion.
 */
export function useTilt({ maxTilt = 8, scale = 1.02 } = {}) {
  const cardRef = useRef(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(pointer: coarse)").matches
    ) {
      return;
    }

    let rafId = null;

    const handleMouseMove = (e) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;

        const rotateX = -yPct * maxTilt * 2;
        const rotateY = xPct * maxTilt * 2;

        el.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(
          2
        )}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${scale}, ${scale}, 1)`;
        el.style.setProperty("--glare-x", `${(mouseX / width) * 100}%`);
        el.style.setProperty("--glare-y", `${(mouseY / height) * 100}%`);
      });
    };

    const handleMouseLeave = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        el.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
      });
    };

    el.addEventListener("mousemove", handleMouseMove, { passive: true });
    el.addEventListener("mouseleave", handleMouseLeave, { passive: true });

    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [maxTilt, scale]);

  return cardRef;
}

/**
 * useMagnetic - Subtle magnetic push effect on pointer proximity.
 * Moves the element a small amount toward the cursor when hovered.
 * Max movement: 8px as recommended by the spec (6-12px).
 */
export function useMagnetic({ strength = 8, ease = 0.15 } = {}) {
  const ref = useRef(null);
  const currentPos = useRef({ x: 0, y: 0 });
  const targetPos = useRef({ x: 0, y: 0 });
  const rafId = useRef(null);
  const isHovering = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(pointer: coarse)").matches
    ) {
      return;
    }

    const animate = () => {
      currentPos.current.x += (targetPos.current.x - currentPos.current.x) * ease;
      currentPos.current.y += (targetPos.current.y - currentPos.current.y) * ease;

      el.style.transform = `translate(${currentPos.current.x.toFixed(2)}px, ${currentPos.current.y.toFixed(2)}px)`;

      if (
        isHovering.current ||
        Math.abs(currentPos.current.x) > 0.1 ||
        Math.abs(currentPos.current.y) > 0.1
      ) {
        rafId.current = requestAnimationFrame(animate);
      } else {
        el.style.transform = "";
      }
    };

    const handleMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      targetPos.current = {
        x: Math.max(-strength, Math.min(strength, dx * 0.35)),
        y: Math.max(-strength, Math.min(strength, dy * 0.35)),
      };
    };

    const handleMouseEnter = () => {
      isHovering.current = true;
      if (!rafId.current) rafId.current = requestAnimationFrame(animate);
    };

    const handleMouseLeave = () => {
      isHovering.current = false;
      targetPos.current = { x: 0, y: 0 };
    };

    el.addEventListener("mousemove", handleMouseMove, { passive: true });
    el.addEventListener("mouseenter", handleMouseEnter, { passive: true });
    el.addEventListener("mouseleave", handleMouseLeave, { passive: true });

    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseenter", handleMouseEnter);
      el.removeEventListener("mouseleave", handleMouseLeave);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [strength, ease]);

  return ref;
}

/**
 * useScrollReveal - Lightweight, IntersectionObserver-based reveal trigger
 * Attaches smoothly when scrolled into viewport with threshold & optional stagger.
 */
export function useScrollReveal({ threshold = 0.12, rootMargin = "0px 0px -30px 0px" } = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || isVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, isVisible]);

  return [ref, isVisible];
}

/**
 * useCipherScramble - Kinetic Hacker/Cipher text scramble effect
 * Decodes or scrambles string with high-velocity glyphs before locking in.
 */
export function useCipherScramble(targetText) {
  const [displayText, setDisplayText] = useState(targetText);
  const [isScrambling, setIsScrambling] = useState(false);
  const chars = "abcdef0123456789!@#$%^&*<>[]{}=";

  const trigger = useCallback(() => {
    setIsScrambling(true);
    let iteration = 0;
    const maxIterations = targetText.length * 2;
    const interval = setInterval(() => {
      setDisplayText(() =>
        targetText
          .split("")
          .map((char, index) => {
            if (index < iteration / 2) {
              return targetText[index];
            }
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );

      iteration += 1;
      if (iteration >= maxIterations) {
        clearInterval(interval);
        setDisplayText(targetText);
        setIsScrambling(false);
      }
    }, 28);

    return () => clearInterval(interval);
  }, [targetText]);

  return { displayText, isScrambling, trigger };
}

/**
 * useGSAPReveal - GSAP-powered staggered section reveal on scroll.
 * Returns a ref to attach to the container element.
 */
export function useGSAPReveal({ delay = 0, y = 24, duration = 0.75, stagger = 0.1, selector = null } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let gsapCtx = null;

    const initGSAP = async () => {
      try {
        const { default: gsap } = await import("gsap");
        const { ScrollTrigger } = await import("gsap/ScrollTrigger");
        gsap.registerPlugin(ScrollTrigger);

        const el = ref.current;
        if (!el) return;

        gsapCtx = gsap.context(() => {
          const targets = selector ? el.querySelectorAll(selector) : [el];

          gsap.fromTo(
            targets,
            { opacity: 0, y },
            {
              opacity: 1,
              y: 0,
              duration,
              delay,
              stagger,
              ease: "power3.out",
              scrollTrigger: {
                trigger: el,
                start: "top 85%",
                once: true,
              },
            }
          );
        }, el);
      } catch (err) {
        // GSAP not available — CSS fallback handles reveal
      }
    };

    initGSAP();

    return () => {
      if (gsapCtx) gsapCtx.revert();
    };
  }, [delay, y, duration, stagger, selector]);

  return ref;
}
