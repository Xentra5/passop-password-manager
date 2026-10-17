import { useEffect, useRef, useState } from "react";
import styles from "./HeroVault.module.css";

const phases = ["idle", "encrypting", "attack", "blocked", "vaulting"];
const phaseDurations = { idle: 3200, encrypting: 2800, attack: 3200, blocked: 2600, vaulting: 3000 };
const phaseAnnouncements = {
  idle: "A sample login is ready in the browser",
  encrypting: "The sample password is being encrypted on this device",
  attack: "Four automated requests approach the vault shield",
  blocked: "The shield blocks the requests; the password stays encrypted",
  vaulting: "The encrypted password is stored in the vault",
};
const phaseLabels = {
  idle: "SAMPLE LOGIN",
  encrypting: "ENCRYPTING IN BROWSER",
  attack: "BOT REQUESTS DETECTED",
  blocked: "PASSWORD STAYS ENCRYPTED",
  vaulting: "CIPHERTEXT SYNCED",
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

function Shield({ className = "" }) {
  return <path className={`${styles.shield} ${className}`} d="M500 48 760 145l-28 182c-32 111-119 181-232 231-113-50-200-120-232-231l-28-182Z" />;
}

function Card({ phase, cardLast4, holderName, cardRef, onPointerMove, onPointerLeave }) {
  const sealed = ["encrypting", "attack", "blocked", "vaulting"].includes(phase);
  return (
    <g
      ref={cardRef}
      className={`${styles.card} ${sealed ? styles.sealedCard : ""}`}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <rect className={styles.cardEdge} x="292" y="176" width="416" height="228" rx="15" />
      <rect className={styles.cardSurface} x="300" y="184" width="400" height="212" rx="18" />
      <rect className={styles.cardBorder} x="300.5" y="184.5" width="399" height="211" rx="17.5" />
      <path className={styles.cardSheen} d="M318 185h145c-30 26-61 50-113 70-13 5-25-3-32-16Z" />
      <rect className={styles.cardTexture} x="300" y="184" width="400" height="212" rx="18" />
      <rect className={styles.cardDim} x="300" y="184" width="400" height="212" rx="13" />
      {phase === "encrypting" && <rect className={styles.scan} x="300" y="184" width="36" height="212" rx="13" />}
      <g className={styles.cardInk}>
        <text x="326" y="216" className={styles.micro}>PASSVAULT</text>
        <text x="326" y="237" className={styles.secondary}>SAVED LOGIN / EXAMPLE.COM</text>
        <text x="326" y="275" className={styles.label}>{sealed ? "CIPHERTEXT / AES-256-GCM" : "SAMPLE PASSWORD"}</text>
        <text x="326" y="312" className={`${styles.number} ${sealed ? styles.hiddenNumber : ""}`}>demo-pass-{cardLast4}</text>
        <text x="326" y="312" className={`${styles.number} ${styles.cipher}`}>8F3A 9C21 7D0E</text>
        <text x="326" y="350" className={styles.label}>USERNAME</text>
        <text x="326" y="372" className={styles.secondary}>{holderName.toLowerCase().trim().split(/\s+/)[0]}@example.com</text>
        <text x="326" y="388" className={styles.label}>ENCRYPTED BEFORE SYNC</text>
      </g>
      {sealed
        ? <g className={styles.sealedPill}><rect x="602" y="204" width="70" height="24" rx="12" /><circle cx="615" cy="216" r="3" /><text x="625" y="216">SEALED</text></g>
        : <text x="605" y="220" className={styles.cardMark}>LOGIN</text>}
      <g className={`${styles.cardLock} ${["attack", "blocked"].includes(phase) ? styles.show : ""}`}>
        <circle cx="626" cy="350" r="15" />
        <rect x="619" y="346" width="14" height="11" rx="2" />
        <path d="M622 346v-5a4 4 0 0 1 8 0v5" />
        <circle cx="626" cy="351" r="1.5" className={styles.lockKeyhole} />
        <text x="650" y="350">{phase === "blocked" ? "LOCKED" : "LOCKING"}</text>
      </g>
    </g>
  );
}

function ThreatWave({ phase }) {
  return (
    <g aria-hidden="true">
      {[0, 1, 2, 3].map((attacker) => (
        <g key={attacker} className={`${styles.threat} ${styles[`threat-${phase}`]} ${styles[`attacker${attacker}`]}`}>
          <path d="M86 274h190" className={styles.threatPath} />
          <circle cx="86" cy="274" r="7" className={styles.attackerDot} />
        </g>
      ))}
    </g>
  );
}

function VaultIcon() {
  return <g className={styles.vaultIcon}><rect x="820" y="438" width="58" height="48" rx="5" /><path d="M832 449h34v26h-34zm0 8h34" /><circle cx="849" cy="469" r="2" /></g>;
}

export default function HeroVault({ className = "", loop = true, cardLast4 = "2048", holderName = "ALEX MORGAN" }) {
  const rootRef = useRef(null);
  const cardRef = useRef(null);
  const [phase, setPhase] = useState("idle");
  const [visible, setVisible] = useState(true);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.08 });
    observer.observe(root);
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (reducedMotion || !loop || !visible) return undefined;
    const timer = window.setTimeout(() => setPhase((current) => phases[(phases.indexOf(current) + 1) % phases.length]), phaseDurations[phase]);
    return () => window.clearTimeout(timer);
  }, [phase, reducedMotion, loop, visible]);

  const activePhase = reducedMotion || !loop ? "blocked" : phase;
  function tiltCard(event) {
    if (reducedMotion || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    const y = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
    cardRef.current?.style.setProperty("--tilt-x", `${x * 7}deg`);
    cardRef.current?.style.setProperty("--tilt-y", `${y * -6}deg`);
  }
  function resetCardTilt() {
    cardRef.current?.style.setProperty("--tilt-x", "0deg");
    cardRef.current?.style.setProperty("--tilt-y", "0deg");
  }
  return (
    <section ref={rootRef} className={`${styles.root} ${className}`} role="img" aria-label="PassVault encrypts a sample login in the browser, blocks four automated requests at the vault shield, and syncs ciphertext while keeping the key on this device.">
      <div className={styles.topbar}><span><i /> BROWSER-SIDE ENCRYPTION</span><span>PASSVAULT / SECURE FLOW</span></div>
      <svg className={styles.visual} viewBox="0 0 1000 560" role="presentation">
        <defs>
          <linearGradient id="hero-scan-gradient"><stop offset="0" stopColor="#8d91ff" stopOpacity="0" /><stop offset=".5" stopColor="#b9baff" stopOpacity=".6" /><stop offset="1" stopColor="#8d91ff" stopOpacity="0" /></linearGradient>
          <linearGradient id="hero-card-surface" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#252a37" /><stop offset=".55" stopColor="#171b25" /><stop offset="1" stopColor="#10141d" /></linearGradient>
          <linearGradient id="hero-card-border" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f6ead0" stopOpacity=".7" /><stop offset=".5" stopColor="#b6b5cf" stopOpacity=".28" /><stop offset="1" stopColor="#9e99ff" stopOpacity=".55" /></linearGradient>
          <linearGradient id="hero-card-sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity=".16" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" /></linearGradient>
          <pattern id="hero-card-texture" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 5.5h6" stroke="#ffffff" strokeOpacity=".025" /></pattern>
          <marker id="hero-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 8 4 0 8" /></marker>
        </defs>
        <Shield className={`${styles.outerShield} ${activePhase === "blocked" ? styles.shieldActive : ""}`} />
        <Shield className={styles.innerShield} />
        <text x="72" y="200" className={styles.small}>{phaseLabels[activePhase]}</text>
        <ThreatWave phase={activePhase} />
        <g className={`${styles.blocked} ${activePhase === "blocked" ? styles.show : ""}`}><rect x="350" y="130" width="194" height="28" rx="5" /><text x="362" y="148">4 REQUESTS STOPPED</text></g>
        <Card phase={activePhase} cardLast4={cardLast4} holderName={holderName} cardRef={cardRef} onPointerMove={tiltCard} onPointerLeave={resetCardTilt} />
        <g className={styles.safeTag}><rect x="52" y="60" width="176" height="34" rx="4" /><text x="69" y="77">AES-256-GCM / SEALED</text></g>
        <g className={styles.sideLabel}><text x="746" y="94">Keys never leave your device</text><text x="746" y="116">LOCAL KEY / LOCAL TRUST</text></g>
        <g className={`${styles.flow} ${activePhase === "vaulting" ? styles.show : ""}`}>
          <text x="716" y="410">CIPHERTEXT ONLY / VAULT</text>
          <g className={styles.device}><rect x="724" y="438" width="32" height="48" rx="4" /><circle cx="740" cy="476" r="2" /></g>
          <path d="M768 462h42" className={styles.arrow} markerEnd="url(#hero-arrow)" /><VaultIcon />
        </g>
      </svg>
      <div className={styles.caption}><strong>Only ciphertext syncs to storage</strong><span>Your master key stays in this browser.</span></div>
      <div className={styles.legend}><span><b className={styles.safeDot} />Encrypted credential</span><span><b className={styles.redDot} />Automated probe</span><em>Illustrative security flow</em></div>
      <div className={styles.srLive} aria-live="polite" aria-atomic="true">{phaseAnnouncements[activePhase]}</div>
    </section>
  );
}
