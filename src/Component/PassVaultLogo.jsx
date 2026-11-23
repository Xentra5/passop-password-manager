/**
 * PassVault Brand Logo Component
 * Minimal geometric wordmark with a custom PV monogram.
 */

const PassVaultLogo = ({
  size = "md",
  showTagline = true,
  showStatusPill = false,
  statusText = "Active",
  onClick,
  className = "",
}) => {
  // Sizing definitions matching standard SaaS design tokens
  const sizeConfig = {
    sm: {
      box: "h-8 w-8 rounded-[9px]",
      title: "text-lg",
      tagline: "text-[9px] tracking-[0.14em]",
      pill: "px-2 py-0.5 text-[10px]",
      dot: "h-2.5 w-2.5",
    },
    md: {
      box: "h-9 w-9 rounded-[10px]",
      title: "text-[22px]",
      tagline: "text-[10px] tracking-[0.15em]",
      pill: "px-2.5 py-0.5 text-[11px]",
      dot: "h-3 w-3",
    },
    lg: {
      box: "h-12 w-12 rounded-xl",
      title: "text-2xl sm:text-3xl",
      tagline: "text-xs tracking-[0.16em]",
      pill: "px-3 py-1 text-xs",
      dot: "h-3.5 w-3.5",
    },
  };

  const currentSize = sizeConfig[size] || sizeConfig.md;

  const content = (
    <div className={`group inline-flex items-center gap-3 select-none ${className}`}>
      {/* ── 1. Geometric Vault Padlock Icon ── */}
      <div
        className={`flex ${currentSize.box} shrink-0 items-center justify-center border border-white/25 bg-black text-white transition-colors group-hover:border-white/50 shadow-sm`}
        aria-hidden="true"
      >
        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
          <path d="M7 10V7a5 5 0 0 1 10 0v3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <rect x="3.5" y="10" width="17" height="12" rx="3" fill="currentColor" />
          <circle cx="12" cy="15" r="1.3" fill="#000000" />
          <path d="M11.3 15.5 L12.7 15.5 L12.9 18.5 L11.1 18.5 Z" fill="#000000" />
        </svg>
      </div>

      {/* ── 2. Brand Wordmark Typography ── */}
      <div className="flex flex-col text-left justify-center">
        <div className="flex items-center leading-none">
          <span
            className={`font-sans ${currentSize.title} font-bold tracking-[-0.04em] text-white`}
          >
            Pass
            <span className="text-neutral-400 font-normal ml-0.5 transition-colors duration-300">
              Vault
            </span>
          </span>
        </div>

        {/* Quiet product descriptor */}
        {showTagline && (
          <div className="mt-1 flex items-center gap-1.5 leading-none">
            <span
              className={`font-sans font-medium uppercase text-neutral-400 ${currentSize.tagline}`}
            >
              PASSWORD MANAGER
            </span>
          </div>
        )}
      </div>

      {/* ── 3. Optional Inline Active Status Pill ── */}
      {showStatusPill && (
        <span
          className={`ml-1 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 ${currentSize.pill} font-medium text-neutral-300 transition-all`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
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
