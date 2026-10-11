import githubIcon from "../assets/github-icon-1-logo.svg";
import PassVaultLogo from "./PassVaultLogo";

const NavBar = ({
  user,
  onLogout,
  onOpenAuth,
  onLockVault,
  activeView,
  setActiveView,
  isPasswordRevealed = false,
  theme = "light",
  onToggleTheme,
}) => {
  return (
    <header className="site-nav nav-reveal sticky top-0 z-30 w-full border-b border-[#ddd8d0]/80 bg-[#f4f1ec]/85 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <PassVaultLogo
            size="md"
            isUnlocked={isPasswordRevealed}
            onClick={() => setActiveView && setActiveView("landing")}
          />

          <span
            className={`hidden items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-medium transition-all duration-300 md:inline-flex ${
              isPasswordRevealed
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm"
                : "border-[#bfe7df] bg-[#e8f6f3] text-[#0d7369]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isPasswordRevealed ? "bg-emerald-500 animate-ping" : "bg-[#0d9488]"
              }`}
            ></span>
            {isPasswordRevealed ? "Unlocked" : "Active"}
          </span>
        </div>

        {/* Center Links (Visible on desktop for landing view) */}
        {!user && (
          <nav className="hidden items-center gap-6 text-xs font-semibold text-[#6f6a63] md:flex">
            <a href="#features" className="transition hover:text-[#176b87]">
              Features
            </a>
            <a href="#cipher-sandbox" className="transition hover:text-[#176b87]">
              Cipher Demo
            </a>
            <a href="#architecture" className="transition hover:text-[#176b87]">
              Architecture
            </a>
          </nav>
        )}

        {/* Navigation & Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {activeView === "vault" ? (
                <>
                  <button
                    type="button"
                    onClick={onLockVault}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#d5d0c8] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#4b5563] transition hover:border-[#176b87] hover:bg-[#f0f8fa] hover:text-[#176b87] active:scale-95"
                    title="Lock vault immediately"
                  >
                    <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="hidden sm:inline">Lock Vault</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveView("landing")}
                    className="hidden rounded-md border border-[#d5d0c8] bg-white px-3 py-1.5 text-xs font-medium text-[#4b5563] hover:bg-[#faf9f7] sm:inline-block"
                  >
                    Landing Page
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveView("vault")}
                  className="rounded-md bg-[#176b87] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#145d74]"
                >
                  Go to Vault
                </button>
              )}
              <span className="hidden text-xs text-[#6f6a63] lg:inline">{user.email}</span>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-md border border-[#d5d0c8] bg-white px-3 py-1.5 text-xs font-medium text-[#4b5563] transition hover:bg-[#faf9f7] hover:text-[#1f2933]"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onOpenAuth("login")}
                className="rounded-md px-3 py-1.5 text-xs font-semibold text-[#4b5563] hover:text-[#1f2933]"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth("register")}
                className="tactile-btn rounded-md bg-[#176b87] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#145d74]"
              >
                Open Vault
              </button>
            </>
          )}

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#d5d0c8] bg-white text-[#4b5563] shadow-xs transition-all hover:border-[#176b87] hover:text-[#176b87] active:scale-95"
            title={theme === "dark" ? "Switch to Warm Light mode" : "Switch to Cyberpunk Dark mode"}
            aria-label="Toggle color theme"
          >
            {theme === "dark" ? (
              <svg className="h-4 w-4 text-amber-400 transition-transform duration-300 hover:rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="h-4 w-4 text-[#176b87] transition-transform duration-300 hover:-rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-md border border-[#d5d0c8] bg-white px-2.5 py-1.5 text-xs font-medium text-[#4b5563] hover:border-[#aaa39a] sm:flex"
            aria-label="GitHub Repository"
          >
            <img
              src={githubIcon}
              alt=""
              className="h-3.5 w-3.5 opacity-70"
            />
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
};

export default NavBar;
