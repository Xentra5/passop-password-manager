/**
 * Prominent PassVault Logo with dynamic interactive Lock states
 * Supports locked (closed shackle) and unlocked (open shackle) visual representations
 */
const PassVaultLogo = ({
  size = "md",
  isUnlocked = false,
  showTagline = true,
  onClick,
  className = "",
}) => {
  // Sizing variants
  const sizeConfig = {
    sm: {
      box: "h-9 w-9 rounded-lg",
      icon: "h-5 w-5",
      title: "text-lg",
      tagline: "text-[9px]",
    },
    md: {
      box: "h-11 w-11 rounded-xl",
      icon: "h-6 w-6",
      title: "text-xl",
      tagline: "text-[10px]",
    },
    lg: {
      box: "h-14 w-14 rounded-2xl",
      icon: "h-8 w-8",
      title: "text-2xl sm:text-3xl",
      tagline: "text-xs",
    },
  };

  const currentSize = sizeConfig[size] || sizeConfig.md;

  const content = (
    <div className={`group inline-flex items-center gap-3 select-none ${className}`}>
      {/* Prominent Emblem Box with 3D Depth & Dynamic Glow */}
      <div
        className={`relative flex ${currentSize.box} items-center justify-center transition-all duration-300 transform group-hover:scale-105 ${
          isUnlocked
            ? "bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#10b981] border border-emerald-400/50 shadow-[0_6px_22px_rgba(16,185,129,0.4)]"
            : "bg-gradient-to-br from-[#0a2f3f] via-[#176b87] to-[#0284c7] border border-cyan-400/40 shadow-[0_6px_22px_rgba(23,107,135,0.35)]"
        }`}
      >
        {/* Subtle inner top-highlight sheen */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[inherit] bg-gradient-to-b from-white/20 to-transparent" />

        {/* Dynamic Vector Lock */}
        <svg
          className={`${currentSize.icon} text-white transition-all duration-300 drop-shadow-sm`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {isUnlocked ? (
            /* Open Lock State: shackle unhooked & lifted upward */
            <g className="transition-all duration-300">
              <path
                d="M7 11V7a5 5 0 0 1 9.9-1.2"
                strokeWidth="2.2"
                className="animate-[pulse_2s_infinite]"
              />
              <rect x="4.5" y="11" width="15" height="10" rx="2.5" fill="currentColor" fillOpacity="0.15" />
              <circle cx="12" cy="15.5" r="1.2" fill="currentColor" />
              <path d="M12 16.7v2" strokeWidth="2" />
            </g>
          ) : (
            /* Secured Lock State: closed shackle firmly latched */
            <g className="transition-all duration-300">
              <path d="M7.5 11V7a4.5 4.5 0 0 1 9 0v4" strokeWidth="2.2" />
              <rect x="4.5" y="11" width="15" height="10" rx="2.5" fill="currentColor" fillOpacity="0.15" />
              <circle cx="12" cy="15.5" r="1.2" fill="currentColor" />
              <path d="M12 16.7v2" strokeWidth="2" />
            </g>
          )}
        </svg>

        {/* Dynamic ambient micro-indicator in corner */}
        <span
          className={`absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full border-2 border-white transition-colors duration-300 ${
            isUnlocked ? "bg-emerald-400 animate-ping" : "bg-[#26968a]"
          }`}
        />
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white transition-colors duration-300 ${
            isUnlocked ? "bg-emerald-400" : "bg-[#26968a]"
          }`}
        />
      </div>

      {/* Prominent Wordmark Typography */}
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-['Space_Grotesk'] ${currentSize.title} font-extrabold tracking-tight text-[#111827]`}
          >
            Pass
            <span
              className={`transition-colors duration-300 ${
                isUnlocked
                  ? "bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent"
                  : "bg-gradient-to-r from-[#176b87] via-[#0284c7] to-[#0d9488] bg-clip-text text-transparent"
              }`}
            >
              Vault
            </span>
          </span>
        </div>

        {showTagline && (
          <div className="flex items-center gap-1.5">
            <span
              className={`font-mono ${currentSize.tagline} font-semibold uppercase tracking-[0.18em] transition-colors duration-300 ${
                isUnlocked ? "text-emerald-700" : "text-[#176b87]"
              }`}
            >
              {isUnlocked ? "🔓 Vault Open" : "Zero-Knowledge"}
            </span>
            <span className="text-[10px] text-[#9ca3af]">•</span>
            <span className="font-mono text-[9px] font-medium text-[#6b7280]">
              AES-256
            </span>
          </div>
        )}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[#176b87] rounded-lg"
      >
        {content}
      </button>
    );
  }

  return content;
};

export default PassVaultLogo;
