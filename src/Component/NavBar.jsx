import githubIcon from "../assets/github-icon-1-logo.svg";
import PassVaultLogo from "./PassVaultLogo";

const NavBar = ({ user, onLogout, onOpenAuth, activeView, setActiveView, isPasswordRevealed = false }) => {
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
            className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-all duration-300 md:inline-flex ${
              isPasswordRevealed
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm"
                : "border-[#b8d9d4] bg-[#e6f2ef] text-[#176b65]"
            }`}
          >
            <span
              className={`beacon-dot h-1.5 w-1.5 rounded-full ${
                isPasswordRevealed ? "bg-emerald-500 animate-ping" : "bg-[#26968a]"
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
                <button
                  type="button"
                  onClick={() => setActiveView("landing")}
                  className="hidden rounded-md border border-[#d5d0c8] bg-white px-3 py-1.5 text-xs font-medium text-[#4b5563] hover:bg-[#faf9f7] sm:inline-block"
                >
                  Landing Page
                </button>
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
