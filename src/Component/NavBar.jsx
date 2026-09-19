import githubIcon from "../assets/github-icon-1-logo.svg";

const NavBar = ({ user, onLogout }) => {
  return (
    <header className="site-nav nav-reveal sticky top-0 z-30 w-full border-b border-[#ddd8d0]/80 bg-[#f4f1ec]/80 transition-all">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-950/40 text-emerald-400 shadow-sm shadow-emerald-500/10">
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
          <div className="flex items-baseline gap-1.5">
            <span className="font-['Space_Grotesk'] text-lg font-bold tracking-tight text-[#1f2933] sm:text-xl">
              Pass<span className="text-[#176b87]">Vault</span>
            </span>
          </div>

          <span className="hidden items-center gap-1.5 rounded-full border border-[#b8d9d4] bg-[#e6f2ef] px-2.5 py-0.5 text-[11px] font-medium text-[#176b65] sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#26968a]"></span>
            Ready
          </span>
        </div>

        {/* Navigation & Action */}
        <div className="flex items-center gap-4">
          {user && <span className="hidden text-xs text-[#6f6a63] sm:inline">{user.email}</span>}
          {user && (
            <button
              type="button"
              onClick={onLogout}
              className="rounded-md border border-[#d5d0c8] bg-white px-3.5 py-2 text-xs font-medium text-[#4b5563] transition-all hover:bg-[#faf9f7] hover:text-[#1f2933]"
            >
              Log out
            </button>
          )}
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-md border border-[#d5d0c8] bg-white px-3.5 py-2 text-xs font-medium text-[#4b5563] transition-all hover:border-[#aaa39a] hover:bg-[#faf9f7] hover:text-[#1f2933] active:scale-[0.98]"
          >
            <img
              src={githubIcon}
              alt="GitHub repository"
              className="h-4 w-4 opacity-70"
            />
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
};

export default NavBar;
