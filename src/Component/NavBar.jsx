import githubIcon from "../assets/github-icon-1-logo.svg";
import PassVaultLogo from "./PassVaultLogo";

const NavBar = ({
  user,
  onLogout,
  onOpenAuth,
  onLockVault,
  onOpenSend,
  activeView,
  setActiveView,
  theme = "light",
  onToggleTheme,
}) => {
  return (
    <header className={`site-nav nav-reveal sticky top-0 z-30 w-full border-b border-[#ddd8d0]/80 bg-[#f4f1ec]/85 backdrop-blur-md transition-all dark:border-white/10 dark:bg-[#0c1017]/88 ${user && activeView === "vault" ? "reference-header" : ""}`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <PassVaultLogo
            size="md"
            onClick={() => setActiveView && setActiveView("landing")}
          />
        </div>

        {/* Center Links (Visible on large screens for landing view) */}
        {!user && (
          <nav className="hidden items-center gap-6 text-xs font-semibold text-[#6f6a63] lg:flex dark:text-[#8b949e]">
            <a href="#features" className="whitespace-nowrap transition hover:text-[#176b87] dark:hover:text-[#38bdf8]">
              Features
            </a>
            <a href="#cipher-sandbox" className="whitespace-nowrap transition hover:text-[#176b87] dark:hover:text-[#38bdf8]">
              Cipher Demo
            </a>
            <a href="#architecture" className="whitespace-nowrap transition hover:text-[#176b87] dark:hover:text-[#38bdf8]">
              Architecture
            </a>
          </nav>
        )}

        {/* Navigation & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              {activeView === "vault" ? (
                <>
                  <button
                    type="button"
                    onClick={onLockVault}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#d5d0c8] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#4b5563] transition hover:border-[#176b87] hover:bg-[#f0f8fa] hover:text-[#176b87] active:scale-95 dark:border-[#30363d] dark:bg-[#161b22] dark:text-[#c9d1d9] dark:hover:border-emerald-600 dark:hover:bg-[#1c2430] dark:hover:text-emerald-400"
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
                    data-reference-hide="true"
                    className="hidden rounded-md border border-[#d5d0c8] bg-white px-3 py-1.5 text-xs font-medium text-[#4b5563] hover:bg-[#faf9f7] sm:inline-block dark:border-[#30363d] dark:bg-[#161b22] dark:text-[#c9d1d9] dark:hover:bg-[#1c2430]"
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
              <span className="hidden text-xs text-[#6f6a63] lg:inline dark:text-[#8b949e]">{user.email}</span>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-md border border-[#d5d0c8] bg-white px-3 py-1.5 text-xs font-medium text-[#4b5563] transition hover:bg-[#faf9f7] hover:text-[#1f2933] dark:border-[#30363d] dark:bg-[#161b22] dark:text-[#c9d1d9] dark:hover:bg-[#1c2430] dark:hover:text-white"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onOpenAuth("login")}
                className="rounded-md px-3 py-1.5 text-xs font-semibold text-[#4b5563] hover:text-[#1f2933] dark:text-[#c9d1d9] dark:hover:text-white"
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

          {/* PassVault Send (Encrypted Secret Sharing) Quick Trigger */}
          <button
            type="button"
            onClick={onOpenSend}
            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-50/80 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-xs transition-all hover:bg-emerald-100 hover:border-emerald-500 active:scale-95 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
            title="PassVault Send: Share an encrypted self-destructing secret"
          >
            <svg className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="hidden sm:inline">Send Secret</span>
          </button>

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
            className="hidden items-center gap-1.5 rounded-md border border-[#d5d0c8] bg-white px-2.5 py-1.5 text-xs font-medium text-[#4b5563] hover:border-[#aaa39a] sm:flex dark:border-[#30363d] dark:bg-[#161b22] dark:text-[#c9d1d9] dark:hover:border-slate-500"
            aria-label="GitHub Repository"
          >
            <img
              src={githubIcon}
              alt=""
              className="h-3.5 w-3.5 opacity-70 dark:invert dark:opacity-85"
            />
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
};

export default NavBar;
