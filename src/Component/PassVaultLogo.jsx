/**
 * PassVault Brand Logo Component
 * Pixel-perfect SaaS application logo featuring:
 * - Oceanic teal gradient squircle emblem
 * - Crisp vector padlock with precision keyhole
 * - Corner active security status dot
 * - High-contrast "PassVault" typography (Slate Black + Vibrant Cyan Teal)
 * - "ZERO-KNOWLEDGE • AES-256" uppercase tracking tagline
 * - Optional inline / companion "Active" status pill
 */

const PassVaultLogo = ({
  size = "md",
  isUnlocked = false,
  showTagline = true,
  showStatusPill = false,
  statusText = "Active",
  onClick,
  className = "",
}) => {
  // Sizing definitions matching standard SaaS design tokens
  const sizeConfig = {
    sm: {
      box: "h-9 w-9 rounded-[10px]",
      icon: "h-4.5 w-4.5",
      title: "text-lg",
      tagline: "text-[9px] tracking-[0.14em]",
      pill: "px-2 py-0.5 text-[10px]",
      dot: "h-2.5 w-2.5",
    },
    md: {
      box: "h-11 w-11 rounded-[13px]",
      icon: "h-5.5 w-5.5",
      title: "text-[22px]",
      tagline: "text-[10px] tracking-[0.15em]",
      pill: "px-2.5 py-0.5 text-[11px]",
      dot: "h-3 w-3",
    },
    lg: {
      box: "h-14 w-14 rounded-2xl",
      icon: "h-7 w-7",
      title: "text-2xl sm:text-3xl",
      tagline: "text-xs tracking-[0.16em]",
      pill: "px-3 py-1 text-xs",
      dot: "h-3.5 w-3.5",
    },
  };

  const currentSize = sizeConfig[size] || sizeConfig.md;

  const content = (
    <div className={`group inline-flex items-center gap-3 select-none ${className}`}>
      {/* ── 1. Squircle Gradient Emblem ── */}
      <div
        className={`relative flex ${currentSize.box} shrink-0 items-center justify-center transition-all duration-300 transform group-hover:scale-[1.03] ${
          isUnlocked
            ? "bg-gradient-to-br from-[#0f766e] via-[#0d9488] to-[#042f2e] border border-emerald-400/40 shadow-[0_4px_16px_rgba(13,148,136,0.35)]"
            : "bg-gradient-to-br from-[#135a6d] via-[#0d4554] to-[#062c37] border border-cyan-400/35 shadow-[0_4px_18px_rgba(6,44,55,0.35)]"
        }`}
      >
        {/* Subtle top light sheen for tactile depth */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[inherit] bg-gradient-to-b from-white/20 to-transparent" />

        {/* Crisp Vector Padlock with Keyhole */}
        <svg
          className={`${currentSize.icon} text-white transition-transform duration-300 drop-shadow-sm`}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {isUnlocked ? (
            /* Unlocked Shackle State */
            <g className="transition-all duration-300">
              <path
                d="M7 11V7a5 5 0 0 1 9.8-1.4"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
              />
              <rect
                x="4"
                y="10.5"
                width="16"
                height="11"
                rx="2.8"
                stroke="currentColor"
                strokeWidth="2.3"
              />
              {/* Keyhole */}
              <circle cx="12" cy="15" r="1.4" fill="currentColor" />
              <path
                d="M11.25 15.6L12.75 15.6L13.05 18.2C13.08 18.45 12.88 18.7 12.63 18.7H11.37C11.12 18.7 10.92 18.45 10.95 18.2L11.25 15.6Z"
                fill="currentColor"
              />
            </g>
          ) : (
            /* Secure Locked State (matches SaaS reference) */
            <g className="transition-all duration-300">
              <path
                d="M7 11V7.2C7 4.88 8.88 3 11.2 3h1.6C15.12 3 17 4.88 17 7.2V11"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
              />
              <rect
                x="4"
                y="10.5"
                width="16"
                height="11"
                rx="2.8"
                stroke="currentColor"
                strokeWidth="2.3"
              />
              {/* Keyhole */}
              <circle cx="12" cy="15" r="1.4" fill="currentColor" />
              <path
                d="M11.25 15.6L12.75 15.6L13.05 18.2C13.08 18.45 12.88 18.7 12.63 18.7H11.37C11.12 18.7 10.92 18.45 10.95 18.2L11.25 15.6Z"
                fill="currentColor"
              />
            </g>
          )}
        </svg>

        {/* ── Active Status Corner Badge ── */}
        <span
          className={`absolute -bottom-0.5 -right-0.5 ${currentSize.dot} rounded-full border-2 border-white shadow-xs transition-colors duration-300 ${
            isUnlocked ? "bg-emerald-400" : "bg-[#0d9488]"
          }`}
        />
      </div>

      {/* ── 2. Brand Wordmark Typography ── */}
      <div className="flex flex-col text-left justify-center">
        <div className="flex items-center leading-none">
          <span
            className={`font-['Space_Grotesk'] ${currentSize.title} font-bold tracking-tight text-[#0f172a]`}
          >
            Pass
            <span className="text-[#0891b2] transition-colors duration-300">
              Vault
            </span>
          </span>
        </div>

        {/* Tagline: ZERO-KNOWLEDGE • AES-256 */}
        {showTagline && (
          <div className="mt-1 flex items-center gap-1.5 leading-none">
            <span
              className={`font-sans font-semibold uppercase text-[#476e7d] ${currentSize.tagline}`}
            >
              ZERO-KNOWLEDGE
            </span>
            <span className="text-[10px] text-[#8aa7b3] font-bold">•</span>
            <span
              className={`font-sans font-semibold uppercase text-[#476e7d] ${currentSize.tagline}`}
            >
              AES-256
            </span>
          </div>
        )}
      </div>

      {/* ── 3. Optional Inline Active Status Pill ── */}
      {showStatusPill && (
        <span
          className={`ml-1 inline-flex items-center gap-1.5 rounded-full border border-[#bfe7df] bg-[#e8f6f3] ${currentSize.pill} font-medium text-[#0d7369] transition-all`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#0d9488]" />
          {statusText}
        </span>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[#0891b2] rounded-xl"
      >
        {content}
      </button>
    );
  }

  return content;
};

export default PassVaultLogo;
