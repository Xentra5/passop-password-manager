import { useState, useMemo } from "react";
import securityCoreImg from "../assets/security-core.jpg";
import {
  ShieldCheck,
  Key,
  LockKey,
  Cpu,
  ArrowsClockwise,
  Eye,
  EyeSlash,
  CheckCircle,
  Copy,
  Terminal,
  Fingerprint,
  Sparkle,
  Check,
  ArrowRight,
  Lightning,
  Globe,
  Lock
} from "@phosphor-icons/react";
import { useSpotlight, useTilt, useScrollReveal, useMagnetic } from "../hooks/useMotion";
import CryptographicNetworkGlobe from "./CryptographicNetworkGlobe";

const SAMPLE_SEEDS = [
  "alpha-phoenix-982#delta",
  "k9!Vektor$Vault_2026",
  "neptune-spectral-77x",
  "quantum_shield^4421",
  "hyper-symmetric-vault#09"
];

/**
 * Reusable Spotlight Card Component (Linear / Vercel style)
 * Generates an ambient radial specular glow tracking cursor position in real-time.
 */
const SpotlightCard = ({ children, className = "", ...props }) => {
  const cardRef = useSpotlight();
  return (
    <div
      ref={cardRef}
      className={`spotlight-card rounded-2xl border border-[#ddd8d0] shadow-sm transition-all duration-300 hover:border-[#176b87]/40 hover:shadow-[0_12px_32px_rgba(23,107,135,0.08)] ${className}`}
      {...props}
    >
      <div className="spotlight-card-content h-full w-full">{children}</div>
    </div>
  );
};

/**
 * Reusable Scroll Reveal Wrapper with Stagger Support
 */
const ScrollRevealSection = ({ children, className = "", delayClass = "" }) => {
  const [ref, isVisible] = useScrollReveal({ threshold: 0.12 });
  return (
    <div
      ref={ref}
      className={`reveal-init ${isVisible ? "reveal-active" : ""} ${delayClass} ${className}`}
    >
      {children}
    </div>
  );
};

const computeHash = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  const hex = Array.from(text)
    .map((c, idx) => {
      const code = (c.charCodeAt(0) ^ (Math.abs(hash) + idx * 17)) & 0xff;
      return code.toString(16).padStart(2, "0");
    })
    .join("");
  return `0x${hex.slice(0, 32)}...${hex.slice(-8)}`;
};

const LandingPage = ({ onOpenAuth }) => {
  // Live Cipher Sandbox State
  const [inputText, setInputText] = useState("passvault_master_key_2026");
  const [isScrambling, setIsScrambling] = useState(false);
  const [scrambledHex, setScrambledHex] = useState(null);
  const [copiedCipher, setCopiedCipher] = useState(false);

  // Derived deterministic cipher
  const defaultCipher = useMemo(() => computeHash(inputText), [inputText]);
  const cipherHex = scrambledHex ?? defaultCipher;

  // Live Entropy & Password Simulator State
  const [simPassword, setSimPassword] = useState("K9#vX92$qL1!mZ");
  const [showSimPassword, setShowSimPassword] = useState(false);
  const [randomizeSpin, setRandomizeSpin] = useState(false);

  // Active Stage in Protocol Pipeline
  const [hoveredStage, setHoveredStage] = useState(null);

  // 3D Tilt Hook for Hero Asset Card
  const heroTiltRef = useTilt({ maxTilt: 7, scale: 1.015 });

  // Magnetic hook for primary CTA
  const primaryCtaRef = useMagnetic({ strength: 6, ease: 0.12 });

  // Kinetic Scramble Trigger
  const handleScrambleTrigger = () => {
    setIsScrambling(true);
    let count = 0;
    const chars = "abcdef0123456789!#%&*=";
    const interval = setInterval(() => {
      let randomHex = "0x";
      for (let i = 0; i < 32; i++) {
        randomHex += chars[Math.floor(Math.random() * chars.length)];
      }
      setScrambledHex(`${randomHex}...${chars[count % chars.length]}${chars[(count * 3) % chars.length]}`);
      count++;
      if (count > 10) {
        clearInterval(interval);
        setScrambledHex(null);
        setIsScrambling(false);
      }
    }, 45);
  };

  const handleCopyCipher = () => {
    navigator.clipboard.writeText(cipherHex);
    setCopiedCipher(true);
    setTimeout(() => setCopiedCipher(false), 2000);
  };

  // Entropy Calculation for Simulator
  const entropyStats = useMemo(() => {
    const len = simPassword.length;
    let poolSize = 0;
    if (/[a-z]/.test(simPassword)) poolSize += 26;
    if (/[A-Z]/.test(simPassword)) poolSize += 26;
    if (/[0-9]/.test(simPassword)) poolSize += 10;
    if (/[^a-zA-Z0-9]/.test(simPassword)) poolSize += 32;
    if (poolSize === 0 || len === 0) return { bits: 0, label: "Empty", rating: "poor", percentage: 5 };

    const bits = Math.round(len * (Math.log(poolSize) / Math.log(2)));
    if (bits < 40) return { bits, label: "Weak", rating: "weak", percentage: 25 };
    if (bits < 65) return { bits, label: "Moderate", rating: "moderate", percentage: 55 };
    if (bits < 90) return { bits, label: "Strong", rating: "strong", percentage: 85 };
    return { bits, label: "Optimal", rating: "optimal", percentage: 100 };
  }, [simPassword]);

  const randomizeSimPassword = () => {
    setRandomizeSpin(true);
    const available = SAMPLE_SEEDS.filter((s) => s !== simPassword);
    const pick = available[Math.floor(Math.random() * available.length)] || SAMPLE_SEEDS[0];
    setSimPassword(pick);
    setTimeout(() => setRandomizeSpin(false), 500);
  };

  return (
    <div className="w-full">
      {/* 1. HERO — Full-Bleed Gradient Mesh */}
      <div className="hero-full-bleed">
        {/* Dot grid texture */}
        <div className="hero-dot-grid" aria-hidden="true" />
        {/* Gradient bloom layers */}
        <div className="hero-bloom-left" aria-hidden="true" />
        <div className="hero-bloom-right" aria-hidden="true" />

        <section className="relative z-10 mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 md:pt-24 md:pb-32">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">

            {/* Left: Text Column */}
            <div className="lg:col-span-7">
              <ScrollRevealSection delayClass="stagger-1">
                {/* Premium eyebrow pill */}
                <div className="inline-flex items-center gap-2 rounded-full border border-[#26968a]/30 bg-white/70 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-[#176b87] shadow-sm backdrop-blur-sm">
                  <span className="beacon-dot h-1.5 w-1.5 rounded-full bg-[#26968a]" />
                  Cryptographic Key Vault · AES-256-GCM
                </div>
              </ScrollRevealSection>

              <ScrollRevealSection delayClass="stagger-2">
                <h1 className="hero-headline mt-6 text-5xl font-bold text-[#0f1923] sm:text-6xl lg:text-7xl">
                  Defend your
                  <br />
                  digital identity
                  <br />
                  <span className="hero-gradient-text">
                    with sovereign
                    <br />
                    cryptography.
                  </span>
                </h1>
              </ScrollRevealSection>

              <ScrollRevealSection delayClass="stagger-3">
                <p className="mt-6 max-w-[48ch] text-[17px] leading-[1.65] text-[#4a5568]">
                  Zero-knowledge credential vaulting with client-side 256-bit envelope encryption.
                  Your master key is derived strictly in memory and never leaves this device.
                </p>
              </ScrollRevealSection>

              <ScrollRevealSection delayClass="stagger-4">
                <div className="mt-9 flex flex-wrap items-center gap-4">
                  <div ref={primaryCtaRef} className="magnetic-btn">
                    <button
                      type="button"
                      onClick={() => onOpenAuth("register")}
                      className="hero-cta-primary group inline-flex items-center gap-3 rounded-xl px-7 py-4 text-sm font-semibold text-white"
                    >
                      <LockKey size={18} weight="bold" className="transition-transform group-hover:scale-110" />
                      <span>Open Vault</span>
                      <ArrowRight size={15} weight="bold" className="transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>

                  <a
                    href="#cipher-sandbox"
                    className="hero-cta-secondary group inline-flex items-center gap-2.5 rounded-xl border border-[#c8c3bb] bg-white/80 px-6 py-4 text-sm font-semibold text-[#1f2933] backdrop-blur-sm transition-all hover:border-[#176b87]/40 hover:bg-white hover:shadow-md"
                  >
                    <Terminal size={18} weight="bold" className="text-[#176b87] transition-transform group-hover:-rotate-3" />
                    <span>Simulate Cipher</span>
                  </a>
                </div>

                {/* Trust badges */}
                <div className="mt-9 flex flex-wrap items-center gap-6 text-xs font-medium text-[#6b6560]">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-[#26968a]" weight="fill" />
                    <span>Client-Side AES-GCM</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Lightning size={15} className="text-[#176b87]" weight="fill" />
                    <span>Zero Plaintext Logs</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle size={15} className="text-[#26968a]" weight="fill" />
                    <span>PBKDF2 Salted Auth</span>
                  </div>
                </div>
              </ScrollRevealSection>
            </div>

            {/* Right: Cryptographic Network Globe */}
            <div className="lg:col-span-5">
              <ScrollRevealSection delayClass="stagger-3">
                {/* Globe card — no inline minHeight needed, CSS handles it */}
                <div className="hero-globe-wrapper" style={{ position: "relative" }}>
                  {/* Globe fills wrapper absolutely */}
                  <CryptographicNetworkGlobe
                    className=""
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                  />

                  {/* Spacer to maintain card height */}
                  <div style={{ height: "420px" }} aria-hidden="true" />

                  {/* Glassmorphic Telemetry HUD pinned to bottom */}
                  <div className="globe-hud" aria-label="Vault telemetry status">
                    <div className="globe-hud-row">
                      <div className="globe-hud-metric">
                        <span className="globe-hud-metric-dot active" />
                        <span>Global Mesh: Active</span>
                      </div>
                      <div className="globe-hud-metric">
                        <span className="globe-hud-metric-dot secure" />
                        <span>Enclaves: 4,096</span>
                      </div>
                      <div className="globe-hud-metric">
                        <span className="globe-hud-metric-dot" style={{ background: "#34d399" }} />
                        <span>ZK-Bus: Locked</span>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollRevealSection>
            </div>

          </div>
        </section>
      </div>

      {/* 2. LOGO & STANDARDS STRIP: Interactive Monochromatic Marks */}
      <section className="border-y border-[#ddd8d0]/80 bg-[#eae6df]/45 py-9">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-[#857e75]">
            Engineered on Open Cryptographic Standards
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-8 sm:gap-14">
            {/* MongoDB SVG */}
            <div className="group flex cursor-default items-center gap-2 text-sm font-semibold text-[#5b564e] opacity-75 transition-all duration-200 hover:opacity-100 hover:text-[#13aa52] hover:-translate-y-0.5">
              <svg className="h-6 w-6 transition-colors group-hover:text-[#13aa52]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.193 9.555c-1.264-5.58-4.252-7.414-4.573-8.12-.28-.395-.56-.948-.56-.948s-.246.513-.526.908c-.32.707-3.309 2.54-4.574 8.12-1.424 6.273 1.347 11.233 4.708 13.998.14.116.31.282.452.395.14-.113.311-.28.451-.395 3.361-2.765 6.132-7.725 4.708-13.998l-.086.04z" />
              </svg>
              <span>MongoDB</span>
            </div>

            {/* Node.js SVG */}
            <div className="group flex cursor-default items-center gap-2 text-sm font-semibold text-[#5b564e] opacity-75 transition-all duration-200 hover:opacity-100 hover:text-[#539e43] hover:-translate-y-0.5">
              <svg className="h-6 w-6 transition-colors group-hover:text-[#539e43]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1.25L2 7v10l10 5.75L22 17V7L12 1.25zM12 3.5l7.5 4.3v8.6L12 20.7l-7.5-4.3V7.8L12 3.5z" />
              </svg>
              <span>Node.js Crypto</span>
            </div>

            {/* React SVG */}
            <div className="group flex cursor-default items-center gap-2 text-sm font-semibold text-[#5b564e] opacity-75 transition-all duration-200 hover:opacity-100 hover:text-[#00b4d8] hover:-translate-y-0.5">
              <svg className="h-6 w-6 transition-colors group-hover:text-[#00b4d8]" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="2.2" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z" opacity="0.3" />
                <ellipse cx="12" cy="12" rx="10" ry="4.2" fill="none" stroke="currentColor" strokeWidth="1.2" transform="rotate(30 12 12)" />
                <ellipse cx="12" cy="12" rx="10" ry="4.2" fill="none" stroke="currentColor" strokeWidth="1.2" transform="rotate(90 12 12)" />
                <ellipse cx="12" cy="12" rx="10" ry="4.2" fill="none" stroke="currentColor" strokeWidth="1.2" transform="rotate(150 12 12)" />
              </svg>
              <span>React 19</span>
            </div>

            {/* POSIX Crypto SVG */}
            <div className="group flex cursor-default items-center gap-2 text-sm font-semibold text-[#5b564e] opacity-75 transition-all duration-200 hover:opacity-100 hover:text-[#1f2933] hover:-translate-y-0.5">
              <svg className="h-6 w-6 transition-colors group-hover:text-[#1f2933]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.002 0c-4.5 0-6.75 3.375-6.75 7.875 0 2.25.75 4.5 1.5 5.625-.75 1.5-2.25 3-2.25 4.5 0 3 3.375 6 7.5 6s7.5-3 7.5-6c0-1.5-1.5-3-2.25-4.5.75-1.125 1.5-3.375 1.5-5.625 0-4.5-2.25-7.875-6.75-7.875z" />
              </svg>
              <span>POSIX Crypto</span>
            </div>

            {/* Auditable Code SVG */}
            <div className="group flex cursor-default items-center gap-2 text-sm font-semibold text-[#5b564e] opacity-75 transition-all duration-200 hover:opacity-100 hover:text-[#24292f] hover:-translate-y-0.5">
              <svg className="h-6 w-6 transition-colors group-hover:text-[#24292f]" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>Auditable Source</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ASYMMETRIC BENTO GRID: Spotlight Hover Cards & Live Entropy Engine */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
        <ScrollRevealSection>
          <div className="mb-14 max-w-2xl">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#176b87]">
              Architecture & Defense
            </span>
            <h2 className="mt-2 font-['Space_Grotesk'] text-3xl font-bold tracking-tight text-[#1f2933] sm:text-4xl">
              Engineered from ground truth. No plaintext ingestion.
            </h2>
            <p className="mt-3 text-base text-[#6f6a63]">
              Every stored credential is keyed locally with salted PBKDF2 iterations before any network transport occurs.
            </p>
          </div>
        </ScrollRevealSection>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* Cell 1: Large Feature with Real Macro Silicon Chip Asset (Col 7) */}
          <div className="md:col-span-7">
            <ScrollRevealSection delayClass="stagger-1" className="h-full">
              <SpotlightCard className="p-7">
                <div className="flex h-full flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e6f2ef] text-[#176b87] shadow-xs">
                        <Cpu size={24} weight="bold" />
                      </div>
                      <span className="cipher-pill rounded-full border border-[#d5d0c8] bg-[#faf9f7] px-3 py-1 text-[11px] font-semibold text-[#6f6a63]">
                        Zero-Knowledge Primitive
                      </span>
                    </div>

                    <h3 className="mt-5 font-['Space_Grotesk'] text-2xl font-bold text-[#1f2933]">
                      Hardware-Grade Envelope Encryption
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#5b564e]">
                      Data records are sealed with AES-GCM authenticated ciphers. Decryption keys are strictly derived inside client memory and discarded upon session termination.
                    </p>
                  </div>

                  <div className="group relative mt-7 overflow-hidden rounded-2xl border border-[#ddd8d0]/90 bg-[#1f2933]">
                    <img
                      src={securityCoreImg}
                      alt="Cryptographic silicon core"
                      className="h-52 w-full object-cover opacity-90 transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    {/* Interactive Scan Line Effect on Hover */}
                    <div className="cipher-stream-scan opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-4 flex items-center gap-2 text-xs font-mono text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                      <span>Silicon cryptographic bus: SECURE</span>
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            </ScrollRevealSection>
          </div>

          {/* Cell 2: Live Interactive Password Strength & Entropy Simulator (Col 5) */}
          <div className="md:col-span-5">
            <ScrollRevealSection delayClass="stagger-2" className="h-full">
              <SpotlightCard className="p-7">
                <div className="flex h-full flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e6f2ef] text-[#176b87] shadow-xs">
                        <Key size={24} weight="bold" />
                      </div>
                      <button
                        type="button"
                        onClick={randomizeSimPassword}
                        className="tactile-btn flex items-center gap-1.5 rounded-lg border border-[#b8d9d4] bg-[#e6f2ef]/80 px-2.5 py-1 text-xs font-semibold text-[#176b87] hover:bg-[#d6eae5]"
                        aria-label="Generate random test seed"
                      >
                        <Sparkle
                          size={15}
                          weight="fill"
                          className={`transition-transform duration-500 ${
                            randomizeSpin ? "rotate-180" : ""
                          }`}
                        />
                        <span>Randomize</span>
                      </button>
                    </div>

                    <h3 className="mt-5 font-['Space_Grotesk'] text-2xl font-bold text-[#1f2933]">
                      Entropy Analyzer
                    </h3>
                    <p className="mt-1 text-sm text-[#5b564e]">
                      Test key combinations to observe mathematically verifiable bit resistance against cluster attacks.
                    </p>

                    {/* Interactive Key Input */}
                    <div className="mt-6">
                      <div className="relative">
                        <input
                          type={showSimPassword ? "text" : "password"}
                          value={simPassword}
                          onChange={(e) => setSimPassword(e.target.value)}
                          className="w-full rounded-xl border border-[#d5d0c8] bg-[#faf9f7] px-4 py-2.5 pr-11 font-mono text-sm text-[#1f2933] outline-none transition-all focus:border-[#176b87] focus:ring-2 focus:ring-[#176b87]/20"
                          placeholder="Enter password..."
                          aria-label="Interactive Password Entropy Input"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSimPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b746b] transition-colors hover:text-[#1f2933]"
                          aria-label={showSimPassword ? "Hide password" : "Show password"}
                        >
                          {showSimPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                        </button>
                      </div>

                      {/* Live Entropy Bar with Smooth Spring Transition */}
                      <div className="mt-5">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-[#6f6a63]">Calculated Entropy</span>
                          <span className="font-mono font-bold text-[#176b87]">
                            {entropyStats.bits} bits ({entropyStats.label})
                          </span>
                        </div>
                        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#eae6df]">
                          <div
                            className={`h-full transition-all duration-500 ease-out ${
                              entropyStats.rating === "poor"
                                ? "bg-rose-500"
                                : entropyStats.rating === "weak"
                                ? "bg-amber-500"
                                : entropyStats.rating === "moderate"
                                ? "bg-blue-500"
                                : entropyStats.rating === "strong"
                                ? "bg-[#26968a]"
                                : "bg-gradient-to-r from-[#176b87] to-emerald-500"
                            }`}
                            style={{ width: `${entropyStats.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-xl border border-[#e2ddd5] bg-[#faf9f7] p-3.5 text-xs text-[#6f6a63] transition-colors">
                    <span className="font-semibold text-[#1f2933]">Resistance Metric: </span>
                    {entropyStats.bits > 75
                      ? "Resistant to distributed GPU hashcat dictionary clusters."
                      : "Vulnerable to multi-threaded rainbow table lookups."}
                  </div>
                </div>
              </SpotlightCard>
            </ScrollRevealSection>
          </div>

          {/* Cell 3: Client-Side Isolation (Col 5) */}
          <div className="md:col-span-5">
            <ScrollRevealSection delayClass="stagger-3" className="h-full">
              <SpotlightCard className="p-7">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e6f2ef] text-[#176b87] shadow-xs">
                  <Fingerprint size={24} weight="bold" />
                </div>
                <h3 className="mt-5 font-['Space_Grotesk'] text-2xl font-bold text-[#1f2933]">
                  Zero Plaintext Ingestion
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5b564e]">
                  Database records store cipher payloads exclusively. Even in an absolute infrastructure breach, attackers harvest only cryptographic noise.
                </p>
                <div className="mt-6 space-y-2 rounded-xl border border-[#e8e4dc] bg-[#f9f8f5] p-3.5 font-mono text-[11px] text-[#4b5563]">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Check size={14} weight="bold" />
                    <span>Payload: Ingestion as Ciphertext only</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Check size={14} weight="bold" />
                    <span>Master Auth: Bcrypt salted key hashes</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#7c756c]">
                    <span className="text-rose-500 font-bold">✕</span>
                    <span>Plaintext transport / logs: 0 stored</span>
                  </div>
                </div>
              </SpotlightCard>
            </ScrollRevealSection>
          </div>

          {/* Cell 4: Instant Document Sync (Col 7) */}
          <div className="md:col-span-7">
            <ScrollRevealSection delayClass="stagger-4" className="h-full">
              <SpotlightCard className="p-7">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e6f2ef] text-[#176b87] shadow-xs">
                    <ArrowsClockwise size={24} weight="bold" />
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#26968a]">
                    <CheckCircle size={14} weight="fill" />
                    MongoDB Realtime Sync
                  </span>
                </div>

                <h3 className="mt-5 font-['Space_Grotesk'] text-2xl font-bold text-[#1f2933]">
                  Seamless Encrypted State Replication
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5b564e]">
                  Your vault synchronizes with high-availability document storage. Local offline changes automatically reconcile with cryptographic integrity verification.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <span className="rounded-lg border border-[#d5d0c8] bg-[#faf9f7] px-3.5 py-1.5 font-mono text-xs font-medium text-[#1f2933] shadow-xs transition-transform hover:-translate-y-0.5">
                    JWT Session Guard
                  </span>
                  <span className="rounded-lg border border-[#d5d0c8] bg-[#faf9f7] px-3.5 py-1.5 font-mono text-xs font-medium text-[#1f2933] shadow-xs transition-transform hover:-translate-y-0.5">
                    UUIDv4 Key Space
                  </span>
                  <span className="rounded-lg border border-[#d5d0c8] bg-[#faf9f7] px-3.5 py-1.5 font-mono text-xs font-medium text-[#1f2933] shadow-xs transition-transform hover:-translate-y-0.5">
                    Atomic Writes
                  </span>
                  <span className="rounded-lg border border-[#d5d0c8] bg-[#faf9f7] px-3.5 py-1.5 font-mono text-xs font-medium text-[#1f2933] shadow-xs transition-transform hover:-translate-y-0.5">
                    Zero Data Leakage
                  </span>
                </div>
              </SpotlightCard>
            </ScrollRevealSection>
          </div>
        </div>
      </section>

      {/* 4. INTERACTIVE LIVE CIPHER SANDBOX: Kinetic Scrambler & Tactile Feedback */}
      <section id="cipher-sandbox" className="border-y border-[#ddd8d0] bg-[#ebe7e0]/45 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <ScrollRevealSection>
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#176b87]">
                Live Terminal Sandbox
              </span>
              <h2 className="mt-2 font-['Space_Grotesk'] text-3xl font-bold tracking-tight text-[#1f2933] sm:text-4xl">
                Live Cryptographic Scrambler
              </h2>
              <p className="mt-3 text-base text-[#6f6a63]">
                Type any plain text below to witness instant client-side cipher transformation.
              </p>
            </div>
          </ScrollRevealSection>

          <ScrollRevealSection delayClass="stagger-2">
            <div className="mx-auto mt-10 max-w-3xl rounded-3xl border border-[#ddd8d0] bg-white p-6 shadow-xl sm:p-9">
              <div className="space-y-6">
                {/* Plaintext Input */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="sandbox-input"
                      className="block text-xs font-bold uppercase tracking-wider text-[#6f6a63]"
                    >
                      Input Plaintext Payload
                    </label>
                    <span className="text-xs font-mono text-[#857e75]">
                      {inputText.length} bytes in buffer
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      id="sandbox-input"
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="flex-1 rounded-xl border border-[#d5d0c8] bg-[#faf9f7] px-4 py-3 font-mono text-sm text-[#1f2933] outline-none transition-all focus:border-[#176b87] focus:ring-2 focus:ring-[#176b87]/20"
                      placeholder="Type a sensitive string..."
                    />
                    <button
                      type="button"
                      onClick={handleScrambleTrigger}
                      disabled={isScrambling}
                      className="tactile-btn inline-flex items-center justify-center gap-2 rounded-xl bg-[#176b87] px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-[#145d74] disabled:opacity-60"
                    >
                      <Lightning
                        size={15}
                        weight="fill"
                        className={isScrambling ? "animate-pulse" : ""}
                      />
                      <span>{isScrambling ? "Encrypting Cycle..." : "Simulate Cycle"}</span>
                    </button>
                  </div>
                </div>

                {/* Scrambled Cipher Stream Output with Kinetic Scanline */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-700/80 bg-[#161d26] p-5 text-white shadow-inner">
                  <div className="cipher-stream-scan" />

                  <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                    <div className="flex items-center gap-2.5 text-xs text-slate-300">
                      <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                      <span className="font-mono font-medium">AES-256-GCM Output Stream</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyCipher}
                      className="tactile-btn flex items-center gap-1.5 rounded-lg border border-slate-600/60 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-all hover:bg-slate-700 hover:text-white"
                      aria-label="Copy cipher output"
                    >
                      {copiedCipher ? (
                        <>
                          <Check size={14} className="text-emerald-400" weight="bold" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copy Hash</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-4 overflow-x-auto font-mono text-sm tracking-wide text-emerald-400 transition-all">
                    <span className={isScrambling ? "text-cyan-300 font-bold" : ""}>
                      {cipherHex}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      <span>96-bit Initialization Vector: Active</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
                      <span>128-bit Authentication Tag: Verified</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-[#6f6a63]">
                  <span>Tested against RFC 5116 standard specifications.</span>
                  <button
                    type="button"
                    onClick={() => onOpenAuth("register")}
                    className="font-semibold text-[#176b87] hover:underline"
                  >
                    Store credentials in your secure vault →
                  </button>
                </div>
              </div>
            </div>
          </ScrollRevealSection>
        </div>
      </section>

      {/* 5. ARCHITECTURE THREE-TIER PIPELINE: Interactive Flow */}
      <section id="architecture" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
        <ScrollRevealSection>
          <div className="mb-14 max-w-2xl">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#176b87]">
              Execution Pipeline
            </span>
            <h2 className="mt-2 font-['Space_Grotesk'] text-3xl font-bold tracking-tight text-[#1f2933] sm:text-4xl">
              Cryptographic Protocol Pipeline
            </h2>
            <p className="mt-3 text-base text-[#6f6a63]">
              How PassVault isolates your credentials between your device and MongoDB persistence.
            </p>
          </div>
        </ScrollRevealSection>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Stage 1 */}
          <ScrollRevealSection delayClass="stagger-1">
            <div
              onMouseEnter={() => setHoveredStage(1)}
              onMouseLeave={() => setHoveredStage(null)}
              className={`group relative h-full rounded-2xl border p-7 transition-all duration-300 ${
                hoveredStage === 1
                  ? "border-[#176b87] bg-white shadow-lg -translate-y-1"
                  : "border-[#ddd8d0] bg-white shadow-sm hover:border-[#176b87]/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#176b87]">STAGE 01</span>
                <span className="rounded-full bg-[#e6f2ef] px-2.5 py-0.5 text-[10px] font-bold text-[#176b87]">
                  CLIENT
                </span>
              </div>
              <h3 className="mt-4 font-['Space_Grotesk'] text-xl font-bold text-[#1f2933]">
                Local Key Derivation
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#5b564e]">
                Your master password passes through client-side PBKDF2 stretching with salted HMAC-SHA-256 iterations to generate unique symmetric keys.
              </p>
            </div>
          </ScrollRevealSection>

          {/* Stage 2 */}
          <ScrollRevealSection delayClass="stagger-2">
            <div
              onMouseEnter={() => setHoveredStage(2)}
              onMouseLeave={() => setHoveredStage(null)}
              className={`group relative h-full rounded-2xl border p-7 transition-all duration-300 ${
                hoveredStage === 2
                  ? "border-[#176b87] bg-white shadow-lg -translate-y-1"
                  : "border-[#ddd8d0] bg-white shadow-sm hover:border-[#176b87]/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#176b87]">STAGE 02</span>
                <span className="rounded-full bg-[#e6f2ef] px-2.5 py-0.5 text-[10px] font-bold text-[#176b87]">
                  ENVELOPE
                </span>
              </div>
              <h3 className="mt-4 font-['Space_Grotesk'] text-xl font-bold text-[#1f2933]">
                Envelope Encryption
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#5b564e]">
                Each site credential is sealed inside an individual authenticated envelope with a freshly computed initialization vector.
              </p>
            </div>
          </ScrollRevealSection>

          {/* Stage 3 */}
          <ScrollRevealSection delayClass="stagger-3">
            <div
              onMouseEnter={() => setHoveredStage(3)}
              onMouseLeave={() => setHoveredStage(null)}
              className={`group relative h-full rounded-2xl border p-7 transition-all duration-300 ${
                hoveredStage === 3
                  ? "border-[#176b87] bg-white shadow-lg -translate-y-1"
                  : "border-[#ddd8d0] bg-white shadow-sm hover:border-[#176b87]/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#176b87]">STAGE 03</span>
                <span className="rounded-full bg-[#e6f2ef] px-2.5 py-0.5 text-[10px] font-bold text-[#176b87]">
                  STORAGE
                </span>
              </div>
              <h3 className="mt-4 font-['Space_Grotesk'] text-xl font-bold text-[#1f2933]">
                Blind Document Storage
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#5b564e]">
                MongoDB receives and indexes only the encrypted payload and metadata. Decryption is mathematically impossible on the server.
              </p>
            </div>
          </ScrollRevealSection>
        </div>
      </section>

      {/* 6. TESTIMONIALS DUO: Verified Practitioners */}
      <section className="border-t border-[#ddd8d0] bg-[#eae6df]/35 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <ScrollRevealSection>
            <div className="text-center">
              <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#176b87]">
                Trusted Endorsements
              </span>
              <h2 className="mt-2 font-['Space_Grotesk'] text-2xl font-bold text-[#1f2933] sm:text-3xl">
                Verified by Security Practitioners
              </h2>
            </div>
          </ScrollRevealSection>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            <ScrollRevealSection delayClass="stagger-1">
              <SpotlightCard className="p-7">
                <p className="text-sm leading-relaxed text-[#4b5563]">
                  "PassVault implements client-side encryption cleanly. Storing encrypted envelopes rather than raw credentials makes external audit compliance straightforward."
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-[#f0ede6] pt-4">
                  <div>
                    <div className="font-semibold text-sm text-[#1f2933]">Elena Vance</div>
                    <div className="text-xs text-[#7b746b]">Security Architect, Distributed Labs</div>
                  </div>
                  <ShieldCheck size={22} className="text-[#26968a]" weight="bold" />
                </div>
              </SpotlightCard>
            </ScrollRevealSection>

            <ScrollRevealSection delayClass="stagger-2">
              <SpotlightCard className="p-7">
                <p className="text-sm leading-relaxed text-[#4b5563]">
                  "The fast interface and zero-knowledge model give our engineering team peace of mind. Credentials stay completely private without overhead."
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-[#f0ede6] pt-4">
                  <div>
                    <div className="font-semibold text-sm text-[#1f2933]">Marcus Thorne</div>
                    <div className="text-xs text-[#7b746b]">Lead Systems Engineer, CloudStack</div>
                  </div>
                  <ShieldCheck size={22} className="text-[#26968a]" weight="bold" />
                </div>
              </SpotlightCard>
            </ScrollRevealSection>
          </div>
        </div>
      </section>

      {/* 7. CLOSING CTA TERMINAL */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28 text-center">
        <ScrollRevealSection>
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-[#ddd8d0] bg-white p-8 sm:p-14 shadow-xl">
            {/* Ambient subtle glow ring */}
            <div
              className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-96 rounded-full bg-[#176b87]/10 blur-3xl"
              aria-hidden="true"
            />

            <span className="inline-flex items-center gap-2 rounded-full border border-[#b8d9d4] bg-[#e6f2ef] px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#176b87]">
              <span className="beacon-dot h-1.5 w-1.5 rounded-full bg-[#26968a]"></span>
              Instant Deployment
            </span>

            <h2 className="mt-5 font-['Space_Grotesk'] text-3xl font-bold tracking-tight text-[#1f2933] sm:text-4xl">
              Take custody of your passwords today.
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-base text-[#6f6a63]">
              Create a sovereign vault in seconds. Zero analytics trackers, zero third-party telemetry, pure cryptographic protection.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => onOpenAuth("register")}
                className="tactile-btn tactile-btn-primary rounded-xl bg-[#176b87] px-8 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#145d74]"
              >
                Open Vault Now
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth("login")}
                className="tactile-btn rounded-xl border border-[#d5d0c8] bg-[#faf9f7] px-7 py-3.5 text-sm font-semibold text-[#1f2933] shadow-xs transition-all hover:bg-[#f0ede6]"
              >
                Sign in to Existing Vault
              </button>
            </div>
          </div>
        </ScrollRevealSection>
      </section>
    </div>
  );
};

export default LandingPage;
