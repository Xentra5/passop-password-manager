import { useEffect, useRef, useState } from "react";

/**
 * CryptographicNetworkGlobe
 * Original 3D cryptographic network visualization — Canvas 2D renderer.
 *
 * Fixes applied:
 * - Canvas sizing waits for ResizeObserver before starting draw loop (0x0 bug fixed)
 * - Increased node / arc opacity for visibility on light backgrounds
 * - Projection scale clamped so sphere always fits within canvas bounds
 * - Improved fallback CSS rings
 */

// ─── Responsive quality helper ─────────────────────────────────────────────
function getQualitySettings() {
  const w = window.innerWidth;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (w < 640) return { nodeCount: 70, arcCount: 16, packetCount: 7, dpr };
  if (w < 1024) return { nodeCount: 120, arcCount: 26, packetCount: 12, dpr };
  return { nodeCount: 200, arcCount: 42, packetCount: 20, dpr };
}

// ─── Fibonacci sphere distribution ─────────────────────────────────────────
function fibonacciSphere(n, radius = 1) {
  const points = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    points.push({
      x: Math.cos(theta) * r * radius,
      y: y * radius,
      z: Math.sin(theta) * r * radius,
    });
  }
  return points;
}

// ─── Quadratic Bezier in 3D (arc bows outward from globe center) ───────────
function bezier3D(p0, p1, t, liftFactor = 1.25) {
  const mx = (p0.x + p1.x) / 2;
  const my = (p0.y + p1.y) / 2;
  const mz = (p0.z + p1.z) / 2;
  const len = Math.sqrt(mx * mx + my * my + mz * mz) || 1;
  const cx = (mx / len) * liftFactor;
  const cy = (my / len) * liftFactor;
  const cz = (mz / len) * liftFactor;

  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * cx + t * t * p1.x,
    y: u * u * p0.y + 2 * u * t * cy + t * t * p1.y,
    z: u * u * p0.z + 2 * u * t * cz + t * t * p1.z,
  };
}

// ─── Project 3D → 2D ─────────────────────────────────────────────────────
function project(x, y, z, scale, cx, cy, rotY, rotX) {
  // Y-axis rotation
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  let rx = x * cosY + z * sinY;
  let rz = -x * sinY + z * cosY;
  let ry = y;

  // X-axis rotation
  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const ry2 = ry * cosX - rz * sinX;
  rz = ry * sinX + rz * cosX;
  ry = ry2;

  // Simple perspective divide
  const CAMERA_DIST = 3.5;
  const persp = CAMERA_DIST / (CAMERA_DIST + rz);

  return {
    sx: cx + rx * persp * scale,
    sy: cy + ry * persp * scale,
    depth: Math.max(0, Math.min(1, (rz + 1.5) / 3)), // 0 = far, 1 = near
    screenZ: rz,
  };
}

// ─── CSS Fallback ────────────────────────────────────────────────────────
function CSSFallbackGlobe() {
  return (
    <div className="globe-css-fallback" aria-hidden="true">
      <div className="globe-ring globe-ring-1" />
      <div className="globe-ring globe-ring-2" />
      <div className="globe-ring globe-ring-3" />
      {Array.from({ length: 12 }, (_, i) => (
        <div
          key={i}
          className="globe-node"
          style={{
            left: `${20 + Math.cos((i / 12) * Math.PI * 2) * 35 + 35}%`,
            top: `${20 + Math.sin((i / 12) * Math.PI * 2) * 35 + 35}%`,
            animationDelay: `${i * 0.25}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function CryptographicNetworkGlobe({ className = "" }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) { setFailed(true); return; }

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const quality = getQualitySettings();
    const { nodeCount, arcCount, packetCount, dpr } = quality;

    // ── State
    const state = {
      W: 0, H: 0,
      rotY: 0.4, rotX: 0.15,
      targetRotY: 0.4, targetRotX: 0.15,
      scrollRot: 0,
      paused: false,
      initialized: false,
      rafId: null,
      lastTime: 0,
    };

    // ── Generate geometry (radius = 1, will be scaled per-frame)
    const nodes = fibonacciSphere(nodeCount, 1.0);

    const arcs = [];
    for (let i = 0; i < arcCount; i++) {
      let a = Math.floor(Math.random() * nodeCount);
      let b = Math.floor(Math.random() * nodeCount);
      while (b === a) b = Math.floor(Math.random() * nodeCount);
      arcs.push({
        a, b,
        opacity: 0.28 + Math.random() * 0.38,
        liftFactor: 1.15 + Math.random() * 0.25,
        color: Math.random() < 0.6 ? "23,107,135" : "38,150,138",
      });
    }

    const packets = [];
    for (let i = 0; i < packetCount; i++) {
      const arcIdx = Math.floor(Math.random() * arcs.length);
      packets.push({
        arcIdx,
        progress: Math.random(),
        speed: 0.003 + Math.random() * 0.005,
        size: 2 + Math.random() * 2.5,
        opacity: 0.8 + Math.random() * 0.2,
        color: Math.random() < 0.5 ? "52,211,153" : "103,232,249",
        trail: [],
      });
    }

    // ── Canvas setup — called by ResizeObserver
    const setupCanvas = (width, height) => {
      state.W = width;
      state.H = height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.scale(dpr, dpr);
      state.initialized = true;
    };

    // ── Event handlers
    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      state.targetRotY = 0.4 + nx * 0.5;
      state.targetRotX = 0.15 + ny * 0.3;
    };

    const onScroll = () => {
      state.scrollRot = window.scrollY * 0.00055;
    };

    // ── Visibility pause
    const observer = new IntersectionObserver(
      ([entry]) => { state.paused = !entry.isIntersecting; },
      { threshold: 0.05 }
    );
    observer.observe(container);

    // ── ResizeObserver triggers canvas init and layout changes
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setupCanvas(width, height);
        }
      }
    });
    resizeObserver.observe(container);

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    // ── Draw loop
    const draw = (timestamp) => {
      state.rafId = requestAnimationFrame(draw);

      if (!state.initialized || state.paused) return;

      const { W, H } = state;
      if (W <= 0 || H <= 0) return;

      const cx = W / 2;
      const cy = H / 2;

      // Scale so globe fills ~70% of shorter dimension
      const scale = Math.min(W, H) * 0.36;

      // Damped pointer interpolation
      state.rotY += (state.targetRotY - state.rotY) * 0.035;
      state.rotX += (state.targetRotX - state.rotX) * 0.035;

      // Continuous auto-rotation
      const autoRotY = reducedMotion ? 0 : timestamp * 0.00014;
      const totalRotY = state.rotY + state.scrollRot + autoRotY;
      const totalRotX = state.rotX;

      // Clear
      ctx.clearRect(0, 0, W, H);

      // ── Connection arcs
      arcs.forEach((arc) => {
        const p0 = nodes[arc.a];
        const p1 = nodes[arc.b];
        const STEPS = 20;

        ctx.beginPath();
        let first = true;

        for (let s = 0; s <= STEPS; s++) {
          const t = s / STEPS;
          const pt = bezier3D(p0, p1, t, arc.liftFactor);
          const proj = project(pt.x, pt.y, pt.z, scale, cx, cy, totalRotY, totalRotX);

          if (first) {
            ctx.moveTo(proj.sx, proj.sy);
            first = false;
          } else {
            ctx.lineTo(proj.sx, proj.sy);
          }
        }

        ctx.strokeStyle = `rgba(${arc.color},${arc.opacity})`;
        ctx.lineWidth = 0.9;
        ctx.stroke();
      });

      // ── Nodes — sorted by depth (painter's algorithm)
      const projected = nodes.map((n, i) => ({
        ...project(n.x, n.y, n.z, scale, cx, cy, totalRotY, totalRotX),
        i,
      }));

      projected
        .slice()
        .sort((a, b) => a.screenZ - b.screenZ)
        .forEach(({ sx, sy, depth, i }) => {
          // Clamp to avoid drawing off-screen dots from depth distortion
          if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) return;

          const size = 1.0 + depth * 3.5;
          const alpha = 0.3 + depth * 0.7;
          const isHighlight = i % 6 === 0;
          const color = isHighlight ? "23,107,135" : "38,150,138";

          // Glow halo for near highlighted nodes
          if (isHighlight && depth > 0.5) {
            ctx.beginPath();
            ctx.arc(sx, sy, size * 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${color},${alpha * 0.12})`;
            ctx.fill();
          }

          // Node dot
          ctx.beginPath();
          ctx.arc(sx, sy, size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${color},${alpha})`;
          ctx.fill();
        });

      // ── Cipher packets traveling along arcs
      packets.forEach((packet) => {
        packet.progress += packet.speed;
        if (packet.progress >= 1) {
          packet.progress = 0;
          if (Math.random() < 0.35) {
            packet.arcIdx = Math.floor(Math.random() * arcs.length);
          }
          packet.trail = [];
        }

        const arc = arcs[packet.arcIdx];
        const p0 = nodes[arc.a];
        const p1 = nodes[arc.b];

        // Ease in-out
        const t = packet.progress < 0.5
          ? 2 * packet.progress * packet.progress
          : 1 - Math.pow(-2 * packet.progress + 2, 2) / 2;

        const pt = bezier3D(p0, p1, t, arc.liftFactor);
        const proj = project(pt.x, pt.y, pt.z, scale, cx, cy, totalRotY, totalRotX);

        if (proj.sx < -10 || proj.sx > W + 10) { packet.trail = []; return; }

        packet.trail.push({ sx: proj.sx, sy: proj.sy, depth: proj.depth });
        if (packet.trail.length > 7) packet.trail.shift();

        // Trail
        for (let ti = 1; ti < packet.trail.length; ti++) {
          const prev = packet.trail[ti - 1];
          const curr = packet.trail[ti];
          const trailAlpha = (ti / packet.trail.length) * 0.5 * proj.depth;
          ctx.beginPath();
          ctx.moveTo(prev.sx, prev.sy);
          ctx.lineTo(curr.sx, curr.sy);
          ctx.strokeStyle = `rgba(${packet.color},${trailAlpha})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Head
        const alpha = packet.opacity * (0.5 + proj.depth * 0.5);
        ctx.beginPath();
        ctx.arc(proj.sx, proj.sy, packet.size * (0.6 + proj.depth * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${packet.color},${alpha})`;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(proj.sx, proj.sy, packet.size * 3 * (0.6 + proj.depth * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${packet.color},${alpha * 0.18})`;
        ctx.fill();
      });

      // ── Soft radial atmosphere (center brighter)
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.45);
      grad.addColorStop(0, "rgba(23,107,135,0.04)");
      grad.addColorStop(1, "rgba(244,241,236,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      state.lastTime = timestamp;
    };

    state.rafId = requestAnimationFrame(draw);

    return () => {
      if (state.rafId) cancelAnimationFrame(state.rafId);
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  if (failed) return <CSSFallbackGlobe />;

  return (
    <div
      ref={containerRef}
      className={`cryptographic-globe-container ${className}`}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="cryptographic-globe-canvas" />
    </div>
  );
}
