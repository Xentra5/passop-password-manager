import { useEffect, useRef } from "react";

/**
 * CryptographicNetworkGlobe — Professional Canvas 2D Globe
 *
 * Key design:
 *  - Sphere with beautiful light gradient fill + graticule grid
 *  - 32 real city nodes with glow + specular highlight
 *  - 28 great-circle arcs — drawn OVER the sphere (not clipped inside)
 *    so they always remain fully visible and leap off the surface
 *  - Glowing cipher packets traveling arcs with motion trails
 *  - Atmosphere glow ring around globe
 *  - Drag to rotate + inertia auto-spin
 *  - Only front-facing elements rendered (backface culled)
 */

// ─── Cities with real lat/lon ──────────────────────────────────────────────
const CITIES = [
  // tier 2 = large hub (dark teal, big glow)
  // tier 1 = medium  (teal)
  // tier 0 = small   (dimmer)
  { lat:  37.8, lon: -122.4, tier: 2 }, // 0  San Francisco
  { lat:  40.7, lon:  -74.0, tier: 2 }, // 1  New York
  { lat:  51.5, lon:   -0.1, tier: 2 }, // 2  London
  { lat:  50.1, lon:    8.7, tier: 2 }, // 3  Frankfurt
  { lat:  47.4, lon:    8.5, tier: 1 }, // 4  Zurich
  { lat:  48.9, lon:    2.4, tier: 1 }, // 5  Paris
  { lat:  52.4, lon:    4.9, tier: 1 }, // 6  Amsterdam
  { lat:  59.3, lon:   18.1, tier: 1 }, // 7  Stockholm
  { lat:  35.7, lon:  139.7, tier: 2 }, // 8  Tokyo
  { lat:   1.4, lon:  103.8, tier: 2 }, // 9  Singapore
  { lat: -33.9, lon:  151.2, tier: 1 }, // 10 Sydney
  { lat:  19.1, lon:   72.9, tier: 1 }, // 11 Mumbai
  { lat:  25.2, lon:   55.3, tier: 1 }, // 12 Dubai
  { lat: -23.6, lon:  -46.6, tier: 1 }, // 13 São Paulo
  { lat:  41.9, lon:  -87.6, tier: 1 }, // 14 Chicago
  { lat:  34.1, lon: -118.2, tier: 1 }, // 15 Los Angeles
  { lat:  43.7, lon:  -79.4, tier: 1 }, // 16 Toronto
  { lat:  37.6, lon:  127.0, tier: 1 }, // 17 Seoul
  { lat:  22.3, lon:  114.2, tier: 1 }, // 18 Hong Kong
  { lat:  39.9, lon:  116.4, tier: 1 }, // 19 Beijing
  { lat:  30.1, lon:   31.2, tier: 0 }, // 20 Cairo
  { lat:  -1.3, lon:   36.8, tier: 0 }, // 21 Nairobi
  { lat:  55.8, lon:   37.6, tier: 0 }, // 22 Moscow
  { lat:  41.0, lon:   29.0, tier: 0 }, // 23 Istanbul
  { lat:  52.2, lon:   21.0, tier: 0 }, // 24 Warsaw
  { lat: -26.2, lon:   28.0, tier: 0 }, // 25 Johannesburg
  { lat:  19.4, lon:  -99.1, tier: 0 }, // 26 Mexico City
  { lat: -34.6, lon:  -58.4, tier: 0 }, // 27 Buenos Aires
  { lat:  -6.2, lon:  106.9, tier: 0 }, // 28 Jakarta
  { lat:  34.7, lon:  135.5, tier: 0 }, // 29 Osaka
  { lat:   6.5, lon:    3.4, tier: 0 }, // 30 Lagos
  { lat:  55.7, lon:   12.6, tier: 0 }, // 31 Copenhagen
];

// ─── Arc connections (city index pairs + color) ────────────────────────────
const ARC_DEFS = [
  // Trans-Atlantic
  { a: 0, b:  2, col: "38,212,191" },
  { a: 1, b:  2, col: "56,189,248" },
  { a: 1, b:  3, col: "52,211,153" },
  { a: 0, b:  1, col: "129,140,248" },
  { a: 0, b: 16, col: "38,212,191" },
  { a: 1, b: 14, col: "56,189,248" },
  { a: 1, b: 13, col: "251,146,60" },
  { a: 0, b: 13, col: "52,211,153" },
  // Europe cluster
  { a: 2, b:  3, col: "56,189,248" },
  { a: 3, b:  4, col: "52,211,153" },
  { a: 2, b:  5, col: "38,212,191" },
  { a: 3, b:  6, col: "129,140,248" },
  { a: 2, b:  7, col: "56,189,248" },
  { a: 3, b: 22, col: "251,146,60" },
  { a: 3, b: 23, col: "52,211,153" },
  { a: 2, b: 20, col: "38,212,191" },
  // Asia-Pacific
  { a: 8, b:  9, col: "52,211,153" },
  { a: 8, b: 17, col: "38,212,191" },
  { a: 8, b: 18, col: "56,189,248" },
  { a: 8, b: 19, col: "129,140,248" },
  { a: 9, b: 10, col: "251,146,60" },
  { a: 9, b: 28, col: "52,211,153" },
  { a: 9, b: 11, col: "38,212,191" },
  { a: 9, b: 18, col: "56,189,248" },
  // Middle-East / Africa
  { a: 11, b: 12, col: "52,211,153" },
  { a: 12, b: 20, col: "38,212,191" },
  { a: 20, b: 21, col: "56,189,248" },
  // Long-haul intercontinental
  { a: 0, b:  8, col: "129,140,248" },
  { a: 3, b: 11, col: "251,146,60" },
  { a: 2, b: 11, col: "52,211,153" },
  { a: 8, b:  3, col: "38,212,191" },
  { a: 0, b: 15, col: "56,189,248" },
];

// ─── Math: lat/lon → unit-sphere 3D vector ────────────────────────────────
function ll3(lat, lon) {
  const φ = (90 - lat)  * (Math.PI / 180);
  const θ = (lon + 180) * (Math.PI / 180);
  return {
    x: -Math.sin(φ) * Math.cos(θ),
    y:  Math.cos(φ),
    z:  Math.sin(φ) * Math.sin(θ),
  };
}

// ─── Project 3D point → 2D screen coords ─────────────────────────────────
function proj(v, ry, rx, R, cx, cy) {
  // Y-axis rotation
  const cosY = Math.cos(ry), sinY = Math.sin(ry);
  let px = v.x * cosY + v.z * sinY;
  let pz = -v.x * sinY + v.z * cosY;
  let py = v.y;
  // X-axis rotation
  const cosX = Math.cos(rx), sinX = Math.sin(rx);
  const py2 = py * cosX - pz * sinX;
  pz = py * sinX + pz * cosX;
  py = py2;
  // Perspective
  const D = 3.6;
  const p = D / (D + pz);
  return {
    sx: cx + px * p * R,
    sy: cy - py * p * R,
    // depth: 0 = far side, 1 = front
    depth: Math.max(0, (1.4 - pz) / 2.8),
    front: pz < D - 0.05,
  };
}

// ─── Sample a point along a quadratic bezier arc lifted off the sphere ─────
function arcPt(p0, p1, t, lift) {
  // Mid-point on the sphere surface, then push outward by lift factor
  const mx = (p0.x + p1.x) / 2;
  const my = (p0.y + p1.y) / 2;
  const mz = (p0.z + p1.z) / 2;
  const len = Math.sqrt(mx*mx + my*my + mz*mz) || 1;
  const cx = (mx/len)*lift, cy = (my/len)*lift, cz = (mz/len)*lift;
  const u = 1 - t;
  return {
    x: u*u*p0.x + 2*u*t*cx + t*t*p1.x,
    y: u*u*p0.y + 2*u*t*cy + t*t*p1.y,
    z: u*u*p0.z + 2*u*t*cz + t*t*p1.z,
  };
}

// ─── Graticule lines (lat/lon grid) ───────────────────────────────────────
function buildGraticule() {
  const lines = [];
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts = [];
    for (let lon = -180; lon <= 180; lon += 3) pts.push(ll3(lat, lon));
    lines.push(pts);
  }
  for (let lon = -180; lon < 180; lon += 30) {
    const pts = [];
    for (let lat = -85; lat <= 85; lat += 3) pts.push(ll3(lat, lon));
    lines.push(pts);
  }
  return lines;
}

// ─── Fibonacci sphere dots (continent texture hint) ───────────────────────
function buildDots(n = 520) {
  const pts = [], φ = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y*y));
    const t = φ * i;
    pts.push({ x: r * Math.cos(t), y, z: r * Math.sin(t) });
  }
  return pts;
}

const GRATICULE = buildGraticule();
const DOTS      = buildDots(520);

// ─── Pre-compute city 3D positions ────────────────────────────────────────
const CITIES_3D = CITIES.map((c) => ({ ...c, v: ll3(c.lat, c.lon) }));

// ─── Pre-compute arc data ─────────────────────────────────────────────────
const ARCS = ARC_DEFS.map((d, i) => ({
  ...d,
  lift: 1.24 + (i % 4) * 0.07, // vary arc height
  v0: CITIES_3D[d.a].v,
  v1: CITIES_3D[d.b].v,
}));

// One packet per arc + one extra on major arcs
const PACKETS = ARCS.flatMap((arc, i) => [
  {
    arc,
    progress: (i * 0.31) % 1,
    speed: 0.0025 + (i % 6) * 0.0007,
    col: arc.col,
    size: 2.6,
    trail: [],
  },
  // Second packet on every 3rd arc (denser traffic)
  ...( i % 3 === 0 ? [{
    arc,
    progress: ((i * 0.31) + 0.5) % 1,
    speed: 0.003 + (i % 5) * 0.0006,
    col: arc.col,
    size: 2.0,
    trail: [],
  }] : []),
]);

const ARC_STEPS = 72; // curve resolution

export default function CryptographicNetworkGlobe({ className = "", style = {} }) {
  const containerRef = useRef(null);
  const canvasRef    = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas    = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // State
    let ry = 0.18, rx = 0.18;  // initial rotation showing Europe/Atlantic
    let velY = 0.0013, velX = 0;
    let isDragging = false, lastX = 0, lastY = 0;
    let W = 0, H = 0, R = 0;
    let isVisible = true;
    let rafId = null;

    // Deep-clone packets so each mount gets fresh state
    const pkts = PACKETS.map((p) => ({ ...p, trail: [] }));

    // ── Resize ─────────────────────────────────────────────────────────────
    const ro = new ResizeObserver(([e]) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = e.contentRect.width;
      H = e.contentRect.height;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width  = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Globe takes up 78% of the shorter side so there's room for aura
      R = Math.min(W, H) * 0.39;
    });
    ro.observe(container);

    // ── Visibility ─────────────────────────────────────────────────────────
    const io = new IntersectionObserver(([e]) => { isVisible = e.isIntersecting; }, { threshold: 0.1 });
    io.observe(container);

    // ── Drag ───────────────────────────────────────────────────────────────
    const getXY = (e) => e.touches ? [e.touches[0].clientX, e.touches[0].clientY] : [e.clientX, e.clientY];
    const onDown = (e) => { isDragging = true; velY = velX = 0; [lastX, lastY] = getXY(e); };
    const onMove = (e) => {
      if (!isDragging) return;
      const [x, y] = getXY(e);
      velY = (x - lastX) * 0.006; velX = (y - lastY) * 0.004;
      ry += velY; rx = Math.max(-0.7, Math.min(0.65, rx + velX));
      lastX = x; lastY = y;
    };
    const onUp = () => { isDragging = false; };

    canvas.addEventListener("mousedown",  onDown);
    window.addEventListener("mousemove",  onMove);
    window.addEventListener("mouseup",    onUp);
    canvas.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("touchmove",  onMove, { passive: true });
    window.addEventListener("touchend",   onUp);

    // ── Draw ───────────────────────────────────────────────────────────────
    let lt = 0;
    const draw = (ts) => {
      rafId = requestAnimationFrame(draw);
      if (!isVisible || W === 0) return;
      const dt = Math.min((ts - lt) / 16.67, 3);
      lt = ts;

      if (!isDragging) {
        velY = velY * 0.96 + 0.0013 * (1 - 0.96);
        velX *= 0.95;
        ry += velY * dt;
        rx = Math.max(-0.7, Math.min(0.65, rx + velX * dt));
      }

      const cx = W / 2, cy = H / 2;
      ctx.clearRect(0, 0, W, H);

      // ── Outer atmosphere aura ─────────────────────────────────────────────
      const aura = ctx.createRadialGradient(cx, cy, R * 0.88, cx, cy, R * 1.28);
      aura.addColorStop(0,   "rgba(23,107,135,0.16)");
      aura.addColorStop(0.45,"rgba(56,150,138,0.07)");
      aura.addColorStop(1,   "rgba(244,241,236,0)");
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.28, 0, Math.PI * 2);
      ctx.fillStyle = aura; ctx.fill();

      // ── Globe base fill ───────────────────────────────────────────────────
      const baseGrd = ctx.createRadialGradient(cx - R*0.25, cy - R*0.20, R*0.05, cx, cy, R);
      baseGrd.addColorStop(0,    "rgba(230,247,250,1)");
      baseGrd.addColorStop(0.38, "rgba(210,238,244,1)");
      baseGrd.addColorStop(0.72, "rgba(188,226,236,1)");
      baseGrd.addColorStop(1,    "rgba(160,210,224,1)");
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = baseGrd; ctx.fill();

      // ── Sphere clip — dot cloud + graticule go inside ─────────────────────
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();

      // Dot cloud
      for (let i = 0; i < DOTS.length; i++) {
        const p = proj(DOTS[i], ry, rx, R, cx, cy);
        if (p.depth < 0.04) continue;
        const f = p.depth * p.depth;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 1.0 * f, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(12,90,118,${0.32 * f})`;
        ctx.fill();
      }

      // Graticule
      for (let gi = 0; gi < GRATICULE.length; gi++) {
        const line = GRATICULE[gi];
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < line.length; i++) {
          const p = proj(line[i], ry, rx, R, cx, cy);
          if (p.depth < 0.02) { started = false; continue; }
          if (!started) { ctx.moveTo(p.sx, p.sy); started = true; }
          else ctx.lineTo(p.sx, p.sy);
        }
        ctx.strokeStyle = "rgba(8,72,100,0.16)";
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      ctx.restore(); // End sphere clip

      // ── Specular highlight (top-left catch light) ─────────────────────────
      const rim = ctx.createRadialGradient(cx + R*0.36, cy - R*0.30, R*0.15, cx, cy, R);
      rim.addColorStop(0,   "rgba(255,255,255,0.60)");
      rim.addColorStop(0.35,"rgba(255,255,255,0.06)");
      rim.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = rim; ctx.fill();

      // Globe border
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(15,95,125,0.25)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // ── ARCS — drawn OVER the sphere so they're always visible ───────────
      for (let ai = 0; ai < ARCS.length; ai++) {
        const arc = ARCS[ai];

        // Sample all points along the arc curve
        const segs = [];
        for (let s = 0; s <= ARC_STEPS; s++) {
          const t  = s / ARC_STEPS;
          const pt = arcPt(arc.v0, arc.v1, t, arc.lift);
          segs.push(proj(pt, ry, rx, R, cx, cy));
        }

        // Determine if this arc is majority on the front hemisphere
        let frontCount = 0;
        segs.forEach((s) => { if (s.depth > 0.45) frontCount++; });
        const visible = frontCount > ARC_STEPS * 0.25; // at least 25% visible
        if (!visible) continue;

        // Glow pass (wide, soft)
        ctx.beginPath();
        let started = false;
        for (const p of segs) {
          if (p.depth < 0.1) { started = false; continue; }
          if (!started) { ctx.moveTo(p.sx, p.sy); started = true; }
          else ctx.lineTo(p.sx, p.sy);
        }
        ctx.strokeStyle = `rgba(${arc.col},0.18)`;
        ctx.lineWidth = 6;
        ctx.lineJoin = "round"; ctx.lineCap = "round";
        ctx.stroke();

        // Core line
        ctx.beginPath(); started = false;
        for (const p of segs) {
          if (p.depth < 0.1) { started = false; continue; }
          if (!started) { ctx.moveTo(p.sx, p.sy); started = true; }
          else ctx.lineTo(p.sx, p.sy);
        }
        ctx.strokeStyle = `rgba(${arc.col},0.65)`;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }

      // ── PACKETS ──────────────────────────────────────────────────────────
      for (const pkt of pkts) {
        pkt.progress += pkt.speed * dt;
        if (pkt.progress >= 1) { pkt.progress = 0; pkt.trail = []; }

        const raw = pkt.progress;
        const t   = raw < 0.5 ? 2*raw*raw : 1 - Math.pow(-2*raw+2,2)/2;
        const pt  = arcPt(pkt.arc.v0, pkt.arc.v1, t, pkt.arc.lift);
        const p   = proj(pt, ry, rx, R, cx, cy);

        if (p.depth < 0.12) { pkt.trail = []; continue; }

        pkt.trail.push({ sx: p.sx, sy: p.sy, d: p.depth });
        if (pkt.trail.length > 10) pkt.trail.shift();

        // Trail lines
        for (let ti = 1; ti < pkt.trail.length; ti++) {
          const prev = pkt.trail[ti-1], curr = pkt.trail[ti];
          const a = (ti / pkt.trail.length) * 0.55 * p.depth;
          ctx.beginPath();
          ctx.moveTo(prev.sx, prev.sy);
          ctx.lineTo(curr.sx, curr.sy);
          ctx.strokeStyle = `rgba(${pkt.col},${a})`;
          ctx.lineWidth = 2.0;
          ctx.stroke();
        }

        // Packet glow halo
        const alpha = Math.min(1, p.depth * 1.5);
        const hs    = pkt.size * (0.5 + p.depth * 0.65);
        const grd   = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, hs * 4);
        grd.addColorStop(0,   `rgba(${pkt.col},${alpha * 0.85})`);
        grd.addColorStop(0.4, `rgba(${pkt.col},${alpha * 0.28})`);
        grd.addColorStop(1,   `rgba(${pkt.col},0)`);
        ctx.beginPath(); ctx.arc(p.sx, p.sy, hs * 4, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();

        // Bright core
        ctx.beginPath(); ctx.arc(p.sx, p.sy, hs, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.95})`;
        ctx.fill();
      }

      // ── CITY NODES (always on top) ────────────────────────────────────────
      const projCities = CITIES_3D
        .map((c) => ({ ...c, p: proj(c.v, ry, rx, R, cx, cy) }))
        .filter((c) => c.p.depth > 0.08)
        .sort((a, b) => a.p.depth - b.p.depth); // back to front

      for (const { tier, p } of projCities) {
        const alpha = 0.30 + p.depth * 0.70;
        const base  = tier === 2 ? 5.5 : tier === 1 ? 3.5 : 2.2;
        const nr    = base * (0.55 + p.depth * 0.55);

        // Outer glow
        const glowR = nr * (tier === 2 ? 4.5 : 3.2);
        const grd   = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, glowR);
        grd.addColorStop(0, `rgba(38,210,190,${alpha * (tier === 2 ? 0.50 : 0.28)})`);
        grd.addColorStop(1, "rgba(38,210,190,0)");
        ctx.beginPath(); ctx.arc(p.sx, p.sy, glowR, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();

        // Core sphere
        ctx.beginPath(); ctx.arc(p.sx, p.sy, nr, 0, Math.PI * 2);
        ctx.fillStyle = tier === 2
          ? `rgba(15,100,130,${alpha})`
          : tier === 1
            ? `rgba(30,145,130,${alpha * 0.92})`
            : `rgba(50,160,148,${alpha * 0.78})`;
        ctx.fill();

        // White specular
        ctx.beginPath();
        ctx.arc(p.sx - nr*0.26, p.sy - nr*0.26, nr*0.40, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.60})`;
        ctx.fill();

        // Extra outer ring on tier-2 nodes (like radar blip)
        if (tier === 2) {
          ctx.beginPath(); ctx.arc(p.sx, p.sy, nr * 2.0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(23,107,135,${alpha * 0.35})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    };

    rafId = requestAnimationFrame(draw);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect(); io.disconnect();
      canvas.removeEventListener("mousedown",  onDown);
      window.removeEventListener("mousemove",  onMove);
      window.removeEventListener("mouseup",    onUp);
      canvas.removeEventListener("touchstart", onDown);
      window.removeEventListener("touchmove",  onMove);
      window.removeEventListener("touchend",   onUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`cryptographic-globe-container ${className}`}
      style={{ cursor: "grab", ...style }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="cryptographic-globe-canvas" />
    </div>
  );
}
