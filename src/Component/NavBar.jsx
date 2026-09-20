import githubIcon from "../assets/github-icon-1-logo.svg";

const NavBar = ({ user, onLogout, onOpenAuth, activeView, setActiveView }) => {
  return (
    <header className="site-nav nav-reveal sticky top-0 z-30 w-full border-b border-[#ddd8d0]/80 bg-[#f4f1ec]/85 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveView && setActiveView("landing")}
            className="flex items-center gap-2.5 text-left transition hover:opacity-90"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#26968a]/30 bg-[#e6f2ef] text-[#176b87] shadow-sm">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <span className="font-['Space_Grotesk'] text-lg font-bold tracking-tight text-[#1f2933] sm:text-xl">
              Pass<span className="text-[#176b87]">Vault</span>
            </span>
          </button>

          <span className="hidden items-center gap-1.5 rounded-full border border-[#b8d9d4] bg-[#e6f2ef] px-2.5 py-0.5 text-[11px] font-medium text-[#176b65] md:inline-flex">
            <span className="beacon-dot h-1.5 w-1.5 rounded-full bg-[#26968a]"></span>
            Active
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
