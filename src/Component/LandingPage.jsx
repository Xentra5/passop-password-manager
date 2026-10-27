// ============================================================================
// LANDINGPAGE.JSX - MARKETING & ARCHITECTURE OVERVIEW COMPONENT
// ============================================================================
// This is the public homepage shown when the user is logged out.
// It contains 7 major sections:
//
// 1. HERO SECTION:
//    - Headline, subheadline, trust badges
//    - Primary "Open Vault" and "Simulate Cipher" CTA buttons
//    - 3D Interactive Cryptographic Network Globe with HUD status indicators
//
// 2. CRYPTOGRAPHIC STANDARDS STRIP:
//    - Interactive technology logos (MongoDB, Node.js Crypto, React 19, POSIX, Auditable)
//
// 3. ASYMMETRIC BENTO GRID:
//    - Card 1: Hardware-Grade Envelope Encryption (Macro silicon image with scanline)
//    - Card 2: Live Entropy Analyzer (Real-time Shannon entropy calculation & password meter)
//    - Card 3: Zero Plaintext Ingestion (Visual checklist of security guarantees)
//    - Card 4: Seamless Encrypted State Replication (MongoDB sync badges)
//
// 4. INTERACTIVE LIVE CIPHER SANDBOX:
//    - Type any text -> simulates real-time AES-256-GCM cipher transformation
//    - Copy hexadecimal ciphertext hash to clipboard
//
// 5. ARCHITECTURE THREE-TIER PIPELINE:
//    - Stage 01: Client-Side PBKDF2 local key derivation
//    - Stage 02: AES-256-GCM individual credential envelopes
//    - Stage 03: Blind document storage in MongoDB
//
// 6. TESTIMONIALS:
//    - Verified security practitioner quotes
//
// 7. CLOSING CTA BANNER:
//    - Final call-to-action to register or sign in
// ============================================================================

import { useState, useMemo } from "react";
import {
  ShieldCheck,
  LockKey,
  Eye,
  EyeSlash,
  CheckCircle,
  Copy,
  Terminal,
  Sparkle,
  Check,
  ArrowRight,
  Lightning,
  Globe,
  Lock
} from "@phosphor-icons/react";
import { useSpotlight, useTilt, useScrollReveal, useMagnetic } from "../hooks/useMotion";
import CryptographicNetworkGlobe from "./CryptographicNetworkGlobe";
import HeroVault from "./HeroVault";

// Sample test passwords for the interactive Entropy Analyzer
const SAMPLE_SEEDS = [
  "alpha-phoenix-982#delta",
  "k9!Vektor$Vault_2026",
  "neptune-spectral-77x",
  "quantum_shield^4421",
  "hyper-symmetric-vault#09"
];

// ============================================================================
// HELPER COMPONENT: SpotlightCard
// Creates a card with an ambient radial spotlight that follows the mouse cursor.
// ============================================================================
const SpotlightCard = ({ children, className = "", ...props }) => {
  const cardRef = useSpotlight(); // Hook calculating mouse coordinates relative to the card
  return (
    <div
      ref={cardRef}
      className={`spotlight-card rounded-2xl border border-[#ddd8d0] dark:border-white/10 dark:bg-[#151b23] shadow-sm transition-all duration-300 hover:border-[#176b87]/40 dark:hover:border-cyan-500/50 hover:shadow-[0_12px_32px_rgba(23,107,135,0.08)] dark:hover:shadow-[0_12px_32px_rgba(34,211,238,0.12)] ${className}`}
      {...props}
    >
      <div className="spotlight-card-content h-full w-full">{children}</div>
    </div>
  );
};

// ============================================================================
// HELPER COMPONENT: ScrollRevealSection
// Uses IntersectionObserver to smoothly fade and slide in sections as the user scrolls.
// ============================================================================
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

// ============================================================================
// HELPER FUNCTION: computeHash
// Fast deterministic pseudo-hash used for instant live simulation in the sandbox.
// ============================================================================
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

// ============================================================================
// MAIN COMPONENT: LandingPage
// Props:
// - onOpenAuth: Callback from App.jsx to open the Login ("login") or Register ("register") modal.
// ============================================================================
const LandingPage = ({ onOpenAuth }) => {
  // --------------------------------------------------------------------------
  // STATE: Live Cipher Sandbox
  // --------------------------------------------------------------------------
  const [inputText, setInputText] = useState("passvault_master_key_2026"); // User text input in sandbox
  const [isScrambling, setIsScrambling] = useState(false);               // Animation running state
  const [scrambledHex, setScrambledHex] = useState(null);                 // Temporary randomized hex text
  const [copiedCipher, setCopiedCipher] = useState(false);               // "Copied!" feedback state

  // Compute cipher deterministically whenever inputText changes:
  const defaultCipher = useMemo(() => computeHash(inputText), [inputText]);
  const cipherHex = scrambledHex ?? defaultCipher;

  // --------------------------------------------------------------------------
  // STATE: Live Password Entropy Simulator
  // --------------------------------------------------------------------------
  const [simPassword, setSimPassword] = useState("K9#vX92$qL1!mZ"); // Password being tested
  const [showSimPassword, setShowSimPassword] = useState(false);    // Toggle eye icon (masked vs plain)
  const [randomizeSpin, setRandomizeSpin] = useState(false);        // Button icon spin animation

  // --------------------------------------------------------------------------
  // STATE: Architecture Pipeline Hover
  // --------------------------------------------------------------------------
  const [hoveredStage, setHoveredStage] = useState(null); // Stage 1, 2, or 3 hovered

  // --------------------------------------------------------------------------
  // MOTION HOOKS
  // --------------------------------------------------------------------------
  const heroTiltRef = useTilt({ maxTilt: 7, scale: 1.015 });        // 3D tilt effect on card
  const primaryCtaRef = useMagnetic({ strength: 6, ease: 0.12 });     // Button pulled towards cursor

  // --------------------------------------------------------------------------
  // HANDLERS: Cipher Sandbox
  // --------------------------------------------------------------------------
  // Simulates rapid encryption cycles with cycling hex characters:
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

  // Copies the output ciphertext to system clipboard:
  const handleCopyCipher = () => {
    navigator.clipboard.writeText(cipherHex);
    setCopiedCipher(true);
    setTimeout(() => setCopiedCipher(false), 2000);
  };

  // --------------------------------------------------------------------------
  // ENTROPY CALCULATION (Information Theory - Shannon Bits)
  // Calculates mathematical resistance against brute-force attacks:
  // --------------------------------------------------------------------------
  const entropyStats = useMemo(() => {
    const len = simPassword.length;
    let poolSize = 0;
    if (/[a-z]/.test(simPassword)) poolSize += 26;        // Lowercase letters
    if (/[A-Z]/.test(simPassword)) poolSize += 26;        // Uppercase letters
    if (/[0-9]/.test(simPassword)) poolSize += 10;        // Numbers
    if (/[^a-zA-Z0-9]/.test(simPassword)) poolSize += 32; // Special characters
    if (poolSize === 0 || len === 0) return { bits: 0, label: "Empty", rating: "poor", percentage: 5 };

    // Shannon Entropy formula: bits = length * log2(poolSize)
    const bits = Math.round(len * (Math.log(poolSize) / Math.log(2)));
    if (bits < 40) return { bits, label: "Weak", rating: "weak", percentage: 25 };
    if (bits < 65) return { bits, label: "Moderate", rating: "moderate", percentage: 55 };
    if (bits < 90) return { bits, label: "Strong", rating: "strong", percentage: 85 };
    return { bits, label: "Optimal", rating: "optimal", percentage: 100 };
  }, [simPassword]);

  // Picks a random seed password for testing:
  const randomizeSimPassword = () => {
    setRandomizeSpin(true);
    const available = SAMPLE_SEEDS.filter((s) => s !== simPassword);
    const pick = available[Math.floor(Math.random() * available.length)] || SAMPLE_SEEDS[0];
    setSimPassword(pick);
    setTimeout(() => setRandomizeSpin(false), 500);
  };

  // ==========================================================================
  // RENDERED PAGE SECTIONS
  // ==========================================================================
  return (
    <div className="landing-page w-full">
      {/* =====================================================================
          SECTION 1: HERO (Gradient mesh, headline, CTAs, 3D Canvas Globe)
          ===================================================================== */}
      <div className="hero-full-bleed">
        {/* Background ambient texture & colored light blooms */}
        <div className="hero-dot-grid" aria-hidden="true" />
        <div className="hero-bloom-left" aria-hidden="true" />
        <div className="hero-bloom-right" aria-hidden="true" />

        <section className="relative z-10 mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 md:pt-24 md:pb-32">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">

            {/* Left Column: Headlines & Call to Actions */}
            <div className="lg:col-span-7">
              <ScrollRevealSection delayClass="stagger-1">
                {/* Security badge pill */}
                <div className="inline-flex items-center gap-2 rounded-full border border-[#26968a]/30 bg-white/80 dark:bg-emerald-950/40 dark:border-emerald-500/30 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-[#176b87] dark:text-emerald-300 shadow-sm backdrop-blur-sm">
                  <span className="beacon-dot h-1.5 w-1.5 rounded-full bg-[#26968a]" />
                  Cryptographic Key Vault · AES-256-GCM
                </div>
              </ScrollRevealSection>

              <ScrollRevealSection delayClass="stagger-2">
                <h1 className="hero-headline mt-6 text-4xl sm:text-6xl lg:text-7xl font-bold text-[#0f1923] dark:text-white">
                  Defend your
                  <br className="hidden sm:inline" />{" "}
                  digital identity
                  <br className="hidden sm:inline" />{" "}
                  <span className="hero-gradient-text">
                    with sovereign
                    <br className="hidden sm:inline" />{" "}
                    cryptography.
                  </span>
                </h1>
              </ScrollRevealSection>

              <ScrollRevealSection delayClass="stagger-3">
                <p className="mt-6 max-w-[48ch] text-[17px] leading-[1.65] text-[#4a5568] dark:text-slate-300">
                  Zero-knowledge credential vaulting with client-side 256-bit envelope encryption.
                  Your master key is derived strictly in memory and never leaves this device.
                </p>
              </ScrollRevealSection>

              <ScrollRevealSection delayClass="stagger-4">
                <div className="mt-9 flex flex-wrap items-center gap-4">
                  {/* Primary CTA: Pops open registration modal */}
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

                  {/* Secondary CTA: Scrolls down to live interactive cipher sandbox */}
                  <a
                    href="#cipher-sandbox"
                    className="hero-cta-secondary group inline-flex items-center gap-2.5 rounded-xl border border-[#c8c3bb] bg-white/80 px-6 py-4 text-sm font-semibold text-[#1f2933] backdrop-blur-sm transition-all hover:border-[#176b87]/40 hover:bg-white hover:shadow-md dark:border-slate-700 dark:bg-[#161f2e] dark:text-slate-200 dark:hover:bg-[#1c273a] dark:hover:border-slate-600"
                  >
                    <Terminal size={18} weight="bold" className="text-[#176b87] dark:text-cyan-400 transition-transform group-hover:-rotate-3" />
                    <span>Simulate Cipher</span>
                  </a>
                </div>

                {/* 3 Core Trust Badges */}
                <div className="mt-9 flex flex-wrap items-center gap-6 text-xs font-medium text-[#6b6560] dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-[#26968a]" weight="fill" />
                    <span>Client-Side AES-GCM</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Lightning size={15} className="text-[#176b87] dark:text-cyan-400" weight="fill" />
                    <span>Zero Plaintext Logs</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle size={15} className="text-[#26968a]" weight="fill" />
                    <span>PBKDF2 Salted Auth</span>
                  </div>
                </div>
              </ScrollRevealSection>
            </div>

            {/* Right Column: 3D Cryptographic Network Globe Canvas */}
            <div className="lg:col-span-5">
              <ScrollRevealSection delayClass="stagger-3">
                <div className="hero-globe-wrapper" style={{ position: "relative" }}>
                  <CryptographicNetworkGlobe
                    className=""
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                  />

                  {/* Spacer to maintain card height for responsive layouts */}
                  <div style={{ height: "420px" }} aria-hidden="true" />

                  {/* Glassmorphic Telemetry HUD pinned to bottom of globe */}
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

      {/* =====================================================================
          SECTION 2: CRYPTOGRAPHIC STANDARDS & TECHNOLOGY LOGOS STRIP
          ===================================================================== */}
      <section className="border-y border-[#ddd8d0]/80 bg-[#eae6df]/45 py-9 dark:border-white/10 dark:bg-[#0a0e16]/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-[#857e75] dark:text-[#94a3b8]">
            Engineered on Open Cryptographic Standards
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-8 sm:gap-14">
            {/* MongoDB */}
            <div className="group flex cursor-default items-center gap-2 text-sm font-semibold text-[#5b564e] dark:text-slate-300 opacity-75 transition-all duration-200 hover:opacity-100 hover:text-[#13aa52] hover:-translate-y-0.5">
              <svg className="h-6 w-6 transition-colors group-hover:text-[#13aa52]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.193 9.555c-1.264-5.58-4.252-7.414-4.573-8.12-.28-.395-.56-.948-.56-.948s-.246.513-.526.908c-.32.707-3.309 2.54-4.574 8.12-1.424 6.273 1.347 11.233 4.708 13.998.14.116.31.282.452.395.14-.113.311-.28.451-.395 3.361-2.765 6.132-7.725 4.708-13.998l-.086.04z" />
              </svg>
              <span>MongoDB</span>
            </div>

            {/* Node.js Crypto */}
            <div className="group flex cursor-default items-center gap-2 text-sm font-semibold text-[#5b564e] dark:text-slate-300 opacity-75 transition-all duration-200 hover:opacity-100 hover:text-[#539e43] hover:-translate-y-0.5">
              <svg className="h-6 w-6 transition-colors group-hover:text-[#539e43]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1.25L2 7v10l10 5.75L22 17V7L12 1.25zM12 3.5l7.5 4.3v8.6L12 20.7l-7.5-4.3V7.8L12 3.5z" />
              </svg>
              <span>Node.js Crypto</span>
            </div>

            {/* React 19 */}
            <div className="group flex cursor-default items-center gap-2 text-sm font-semibold text-[#5b564e] dark:text-slate-300 opacity-75 transition-all duration-200 hover:opacity-100 hover:text-[#00b4d8] hover:-translate-y-0.5">
              <svg className="h-6 w-6 transition-colors group-hover:text-[#00b4d8]" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="2.2" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z" opacity="0.3" />
                <ellipse cx="12" cy="12" rx="10" ry="4.2" fill="none" stroke="currentColor" strokeWidth="1.2" transform="rotate(30 12 12)" />
                <ellipse cx="12" cy="12" rx="10" ry="4.2" fill="none" stroke="currentColor" strokeWidth="1.2" transform="rotate(90 12 12)" />
                <ellipse cx="12" cy="12" rx="10" ry="4.2" fill="none" stroke="currentColor" strokeWidth="1.2" transform="rotate(150 12 12)" />
              </svg>
              <span>React 19</span>
            </div>

            {/* POSIX Crypto */}
            <div className="group flex cursor-default items-center gap-2 text-sm font-semibold text-[#5b564e] dark:text-slate-300 opacity-75 transition-all duration-200 hover:opacity-100 hover:text-[#1f2933] dark:hover:text-white hover:-translate-y-0.5">
              <svg className="h-6 w-6 transition-colors group-hover:text-[#1f2933] dark:group-hover:text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.002 0c-4.5 0-6.75 3.375-6.75 7.875 0 2.25.75 4.5 1.5 5.625-.75 1.5-2.25 3-2.25 4.5 0 3 3.375 6 7.5 6s7.5-3 7.5-6c0-1.5-1.5-3-2.25-4.5.75-1.125 1.5-3.375 1.5-5.625 0-4.5-2.25-7.875-6.75-7.875z" />
              </svg>
              <span>POSIX Crypto</span>
            </div>

            {/* Auditable Source */}
            <div className="group flex cursor-default items-center gap-2 text-sm font-semibold text-[#5b564e] dark:text-slate-300 opacity-75 transition-all duration-200 hover:opacity-100 hover:text-[#24292f] dark:hover:text-white hover:-translate-y-0.5">
              <svg className="h-6 w-6 transition-colors group-hover:text-[#24292f] dark:group-hover:text-white" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>Auditable Source</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: HERO VAULT SECURITY EXPERIENCE */}
      <div className="relative overflow-hidden py-4 md:py-8">
        <div
          className="pointer-events-none absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-cyan-500/10 blur-[100px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute top-1/2 right-1/4 -translate-y-1/2 translate-x-1/2 h-80 w-80 rounded-full bg-violet-500/12 blur-[100px]"
          aria-hidden="true"
        />
        <div className="hero-vault-heading">
          <span>PRIVATE BY DESIGN</span>
          <h2>Your password is sealed before it leaves<br className="hidden sm:block" /> your device.</h2>
          <p>Encryption happens locally, before anything reaches your vault.</p>
        </div>
        <div className="hero-vault-layout">
          <HeroVault />
          <aside className="hero-vault-info">
            <span className="hero-vault-info-kicker">THE IMPORTANT PART</span>
            <h3>Your database never gets<br /> the key.</h3>
            <p>PassVault encrypts each saved password in your browser. The database stores an encrypted value; the decryption key is derived from your master password and held in browser memory.</p>
            <div className="hero-vault-flow">
              <div><b>01</b><strong>Your device</strong><small>Derive key locally</small></div>
              <i aria-hidden="true">&rarr;</i>
              <div><b>02</b><strong>Encrypted</strong><small>Unreadable payload</small></div>
              <i aria-hidden="true">&rarr;</i>
              <div><b>03</b><strong>Your vault</strong><small>Store ciphertext</small></div>
            </div>
            <div className="hero-vault-callout">
              <span aria-hidden="true">&#8599;</span>
              <p><b>A database copy alone is not your password.</b><br />Your master password is still needed to unlock credentials.</p>
            </div>
            <button type="button" onClick={() => onOpenAuth("register")}>Protect my vault <span aria-hidden="true">&rarr;</span></button>
            <small className="hero-vault-disclaimer">Encryption protects stored data. It cannot protect a device already infected with malware or a vault left unlocked.</small>
          </aside>
        </div>
      </div>

      {/* SECTION: 3D VAULT DEFENSE INTERACTIVE EXPERIENCE (#features anchor) */}

      {/* =====================================================================
          SECTION 4: INTERACTIVE LIVE CIPHER SANDBOX (Type & Scramble)
          ===================================================================== */}
      <section id="cipher-sandbox" className="cipher-lab-section border-y border-[#ddd8d0] bg-[#ebe7e0]/45 dark:border-white/10 dark:bg-[#0a0e16]/60 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <ScrollRevealSection>
            <div className="cipher-lab-heading">
              <div className="cipher-lab-kicker">
                <span className="cipher-lab-kicker-dot" />
                Interactive demo <span aria-hidden="true">·</span> runs locally
              </div>
              <h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-tight text-[#1f2933] dark:text-white sm:text-4xl">
                A closer look at <em>ciphertext.</em>
              </h2>
              <p className="mt-4 max-w-xl text-base text-[#6f6a63] dark:text-slate-300">
                Explore a sample transformation in your browser. This visual demo is separate from the encryption used by your vault.
              </p>
            </div>
          </ScrollRevealSection>

          <ScrollRevealSection delayClass="stagger-2">
            <div className="cipher-lab-shell mx-auto mt-10 max-w-5xl">
              <div className="cipher-lab-rail" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="cipher-lab-panel">
                <div className="cipher-lab-panel-intro">
                  <span className="cipher-lab-index">Cipher preview</span>
                  <span className="cipher-lab-mode">Runs in your browser</span>
                </div>
                <div className="cipher-lab-workspace">
                {/* Input Field */}
                <div className="cipher-lab-input">
                  <div className="cipher-lab-label-row">
                    <label
                      htmlFor="sandbox-input"
                      className="block text-xs font-bold uppercase tracking-wider text-[#6f6a63] dark:text-slate-300"
                    >
                      Source payload
                    </label>
                    <span className="cipher-lab-counter">{String(inputText.length).padStart(2, "0")} characters</span>
                  </div>

                  <div className="cipher-lab-input-row">
                    <input
                      id="sandbox-input"
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="cipher-lab-input-field flex-1 rounded-xl border border-[#d5d0c8] bg-[#faf9f7] dark:border-slate-700 dark:bg-[#0d1117] dark:text-white px-4 py-3 font-mono text-sm text-[#1f2933] outline-none transition-all focus:border-[#176b87] focus:ring-2 focus:ring-[#176b87]/20"
                      placeholder="Type a sensitive string..."
                    />
                    <button
                      type="button"
                      onClick={handleScrambleTrigger}
                      disabled={isScrambling}
                      className="cipher-lab-trigger tactile-btn inline-flex items-center justify-center gap-2 rounded-xl bg-[#176b87] px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-[#145d74] disabled:opacity-60"
                    >
                      <Lightning
                        size={15}
                        weight="fill"
                        className={isScrambling ? "animate-pulse" : ""}
                      />
                      <span>{isScrambling ? "Running preview…" : "Run preview"}</span>
                    </button>
                  </div>
                </div>

                {/* Encrypted Hex Output Terminal Box */}
                <div className={`cipher-lab-output relative overflow-hidden rounded-2xl border p-5 text-white shadow-inner transition-all duration-300 ${
                    isScrambling
                      ? "border-cyan-500/60 bg-[#0d1520] shadow-[0_0_20px_rgba(34,211,238,0.18)]"
                      : "border-slate-700/80 bg-[#161d26]"
                  }`}>
                  <div className="cipher-stream-scan" />

                  <div className="cipher-lab-output-head flex items-center justify-between border-b border-slate-700/80 pb-3">
                    <div className="flex items-center gap-2.5 text-xs text-slate-300">
                      <span className="cipher-lab-live-dot h-2 w-2 rounded-full bg-emerald-400"></span>
                      <span className="font-mono font-medium">Simulated hash output</span>
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

                  <div className="cipher-lab-hash mt-4 overflow-x-auto font-mono text-sm tracking-wide text-emerald-400 transition-all">
                  <span className={`transition-all duration-150 ${
                    isScrambling
                      ? "text-cyan-300 font-bold cipher-scramble-active"
                      : "text-emerald-400"
                  }`}>
                      {cipherHex}
                    </span>
                  </div>

                  <div className="cipher-lab-meta mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      <span>Illustrative only · this output does not encrypt your payload</span>
                    </div>
                  </div>
                </div>

                <div className="cipher-lab-footer flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-[#6f6a63]">
                  <span><span className="cipher-lab-footer-mark">↗</span> Demo only · no vault data is changed</span>
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
            </div>
          </ScrollRevealSection>
        </div>
      </section>

      {/* =====================================================================
          SECTION 5: PROTOCOL PIPELINE (Life of a Packet: 3 Stages)
          ===================================================================== */}
      <section id="architecture" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
        <ScrollRevealSection>
          <div className="mb-14 max-w-2xl">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#176b87] dark:text-cyan-400">
              Execution Pipeline
            </span>
            <h2 className="mt-2 font-['Space_Grotesk'] text-3xl font-bold tracking-tight text-[#1f2933] dark:text-white sm:text-4xl">
              Cryptographic Protocol Pipeline
            </h2>
            <p className="mt-3 text-base text-[#6f6a63] dark:text-slate-300">
              How PassVault isolates your credentials between your device and MongoDB persistence.
            </p>
          </div>
        </ScrollRevealSection>

        <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
          {/* Stage 1: Key Derivation */}
          <ScrollRevealSection delayClass="stagger-1">
            <div
              onMouseEnter={() => setHoveredStage(1)}
              onMouseLeave={() => setHoveredStage(null)}
              className={`group relative h-full rounded-2xl border p-7 transition-all duration-300 ${
                hoveredStage === 1
                  ? "border-[#176b87] bg-white dark:bg-[#151b23] dark:border-cyan-500 shadow-lg -translate-y-1"
                  : "border-[#ddd8d0] bg-white dark:border-white/10 dark:bg-[#151b23] shadow-sm hover:border-[#176b87]/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#176b87] dark:text-cyan-400">STAGE 01</span>
                <span className="rounded-full bg-[#e6f2ef] dark:bg-cyan-950/40 dark:text-cyan-300 px-2.5 py-0.5 text-[10px] font-bold text-[#176b87]">
                  CLIENT
                </span>
              </div>
              <h3 className="mt-4 font-['Space_Grotesk'] text-xl font-bold text-[#1f2933] dark:text-white">
                Local Key Derivation
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#5b564e] dark:text-slate-300">
                Your master password passes through client-side PBKDF2 stretching with salted HMAC-SHA-256 iterations to generate unique symmetric keys.
              </p>
            </div>
          </ScrollRevealSection>

          {/* Pipeline Arrow 1→2 */}
          <div className="hidden md:flex items-center justify-center self-center px-1 py-0">
            <span className="pipeline-arrow-connector">
              <svg viewBox="0 0 48 24" width="48" height="24" aria-hidden="true" className="pipeline-arrow-svg">
                <path d="M2 12 H38" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" fill="none" className="pipeline-dash"/>
                <path d="M34 6 L46 12 L34 18" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </div>

          {/* Stage 2: Envelope Encryption */}
          <ScrollRevealSection delayClass="stagger-2">
            <div
              onMouseEnter={() => setHoveredStage(2)}
              onMouseLeave={() => setHoveredStage(null)}
              className={`group relative h-full rounded-2xl border p-7 transition-all duration-300 ${
                hoveredStage === 2
                  ? "border-[#176b87] bg-white dark:bg-[#151b23] dark:border-cyan-500 shadow-lg -translate-y-1"
                  : "border-[#ddd8d0] bg-white dark:border-white/10 dark:bg-[#151b23] shadow-sm hover:border-[#176b87]/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#176b87] dark:text-cyan-400">STAGE 02</span>
                <span className="rounded-full bg-[#e6f2ef] dark:bg-cyan-950/40 dark:text-cyan-300 px-2.5 py-0.5 text-[10px] font-bold text-[#176b87]">
                  ENVELOPE
                </span>
              </div>
              <h3 className="mt-4 font-['Space_Grotesk'] text-xl font-bold text-[#1f2933] dark:text-white">
                Envelope Encryption
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#5b564e] dark:text-slate-300">
                Each site credential is sealed inside an individual authenticated envelope with a freshly computed initialization vector.
              </p>
            </div>
          </ScrollRevealSection>

          {/* Pipeline Arrow 2→3 */}
          <div className="hidden md:flex items-center justify-center self-center px-1 py-0">
            <span className="pipeline-arrow-connector">
              <svg viewBox="0 0 48 24" width="48" height="24" aria-hidden="true" className="pipeline-arrow-svg">
                <path d="M2 12 H38" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" fill="none" className="pipeline-dash"/>
                <path d="M34 6 L46 12 L34 18" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </div>

          {/* Stage 3: Blind Document Storage */}
          <ScrollRevealSection delayClass="stagger-3">
            <div
              onMouseEnter={() => setHoveredStage(3)}
              onMouseLeave={() => setHoveredStage(null)}
              className={`group relative h-full rounded-2xl border p-7 transition-all duration-300 ${
                hoveredStage === 3
                  ? "border-[#176b87] bg-white dark:bg-[#151b23] dark:border-cyan-500 shadow-lg -translate-y-1"
                  : "border-[#ddd8d0] bg-white dark:border-white/10 dark:bg-[#151b23] shadow-sm hover:border-[#176b87]/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#176b87] dark:text-cyan-400">STAGE 03</span>
                <span className="rounded-full bg-[#e6f2ef] dark:bg-cyan-950/40 dark:text-cyan-300 px-2.5 py-0.5 text-[10px] font-bold text-[#176b87]">
                  STORAGE
                </span>
              </div>
              <h3 className="mt-4 font-['Space_Grotesk'] text-xl font-bold text-[#1f2933] dark:text-white">
                Blind Document Storage
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#5b564e] dark:text-slate-300">
                MongoDB receives and indexes only the encrypted payload and metadata. Decryption is mathematically impossible on the server.
              </p>
            </div>
          </ScrollRevealSection>
        </div>
      </section>

      {/* =====================================================================
          SECTION 6: VERIFIED PRACTITIONER TESTIMONIALS
          ===================================================================== */}
      <section className="border-t border-[#ddd8d0] bg-[#eae6df]/35 dark:border-white/10 dark:bg-[#0a0e16]/40 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <ScrollRevealSection>
            <div className="text-center">
              <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#176b87] dark:text-cyan-400">
                Trusted Endorsements
              </span>
              <h2 className="mt-2 font-['Space_Grotesk'] text-2xl font-bold text-[#1f2933] dark:text-white sm:text-3xl">
                Verified by Security Practitioners
              </h2>
            </div>
          </ScrollRevealSection>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            <ScrollRevealSection delayClass="stagger-1">
              <SpotlightCard className="p-7">
                <p className="text-sm leading-relaxed text-[#4b5563] dark:text-slate-300">
                  "PassVault implements client-side encryption cleanly. Storing encrypted envelopes rather than raw credentials makes external audit compliance straightforward."
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-[#f0ede6] dark:border-slate-800 pt-4">
                  <div>
                    <div className="font-semibold text-sm text-[#1f2933] dark:text-white">Elena Vance</div>
                    <div className="text-xs text-[#7b746b] dark:text-slate-400">Security Architect, Distributed Labs</div>
                  </div>
                  <ShieldCheck size={22} className="text-[#26968a]" weight="bold" />
                </div>
              </SpotlightCard>
            </ScrollRevealSection>

            <ScrollRevealSection delayClass="stagger-2">
              <SpotlightCard className="p-7">
                <p className="text-sm leading-relaxed text-[#4b5563] dark:text-slate-300">
                  "The fast interface and zero-knowledge model give our engineering team peace of mind. Credentials stay completely private without overhead."
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-[#f0ede6] dark:border-slate-800 pt-4">
                  <div>
                    <div className="font-semibold text-sm text-[#1f2933] dark:text-white">Marcus Thorne</div>
                    <div className="text-xs text-[#7b746b] dark:text-slate-400">Lead Systems Engineer, CloudStack</div>
                  </div>
                  <ShieldCheck size={22} className="text-[#26968a]" weight="bold" />
                </div>
              </SpotlightCard>
            </ScrollRevealSection>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 7: CLOSING CALL-TO-ACTION TERMINAL
          ===================================================================== */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28 text-center">
        <ScrollRevealSection>
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-[#ddd8d0] bg-white dark:border-white/10 dark:bg-[#151b23] p-8 sm:p-14 shadow-xl">
            {/* Ambient subtle glow ring */}
            <div
              className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-96 rounded-full bg-[#176b87]/10 dark:bg-cyan-500/10 blur-3xl"
              aria-hidden="true"
            />

            <span className="inline-flex items-center gap-2 rounded-full border border-[#b8d9d4] bg-[#e6f2ef] dark:border-cyan-800/40 dark:bg-cyan-950/40 dark:text-cyan-300 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#176b87]">
              <span className="beacon-dot h-1.5 w-1.5 rounded-full bg-[#26968a]"></span>
              Instant Deployment
            </span>

            <h2 className="mt-5 font-['Space_Grotesk'] text-3xl font-bold tracking-tight text-[#1f2933] dark:text-white sm:text-4xl">
              Take custody of your passwords today.
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-base text-[#6f6a63] dark:text-slate-300">
              Create a sovereign vault in seconds. Zero analytics trackers, zero third-party telemetry, pure cryptographic protection.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              {/* Button to open registration */}
              <button
                type="button"
                onClick={() => onOpenAuth("register")}
                className="tactile-btn cta-primary-glow rounded-xl bg-gradient-to-r from-[#176b87] via-[#1a8fa0] to-[#26968a] px-8 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:scale-[1.04] hover:shadow-[0_0_28px_rgba(14,165,233,0.45)] active:scale-[0.98]"
              >
                Open Vault Now
              </button>
              {/* Button to open login */}
              <button
                type="button"
                onClick={() => onOpenAuth("login")}
                className="tactile-btn rounded-xl border border-[#d5d0c8] bg-[#faf9f7] dark:border-slate-700 dark:bg-[#1c2430] dark:text-white dark:hover:bg-[#253040] px-7 py-3.5 text-sm font-semibold text-[#1f2933] shadow-xs transition-all hover:bg-[#f0ede6] hover:scale-[1.02] active:scale-[0.98]"
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
