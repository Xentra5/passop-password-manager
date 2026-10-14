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
      {/* ── 1. Geometric PV monogram ── */}
      <div
        className={`flex ${currentSize.box} shrink-0 items-center justify-center border border-[#cbd6da] bg-[#edf3f4] font-sans text-[11px] font-bold tracking-[-0.08em] text-[#176b78] transition-colors group-hover:border-[#8eabb1] group-hover:bg-white dark:border-[#34434b] dark:bg-[#182329] dark:text-[#9ed0d3]`}
        aria-hidden="true"
      >
        <span>PV</span>
      </div>

      {/* ── 2. Brand Wordmark Typography ── */}
      <div className="flex flex-col text-left justify-center">
        <div className="flex items-center leading-none">
          <span
            className={`font-sans ${currentSize.title} font-semibold tracking-[-0.055em] text-[#0f172a] dark:text-white`}
          >
            Pass
            <span className="text-[#64748b] dark:text-[#cbd5e1] transition-colors duration-300">
              Vault
            </span>
          </span>
        </div>

        {/* Quiet product descriptor instead of a marketing-heavy security label. */}
        {showTagline && (
          <div className="mt-1 flex items-center gap-1.5 leading-none">
            <span
              className={`font-sans font-medium uppercase text-[#64748b] dark:text-[#94a3b8] ${currentSize.tagline}`}
            >
              PASSWORD MANAGER
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
