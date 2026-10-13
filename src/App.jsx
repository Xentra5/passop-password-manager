// ============================================================================
// APP.JSX - ROOT COMPONENT WITH PROFESSIONAL HTTPONLY COOKIE AUTH
//
// SECURITY & SESSION ARCHITECTURE:
// - Professional HttpOnly Cookie: Auth token is stored securely in an HttpOnly,
//   SameSite, Secure cookie by the browser. It cannot be stolen by XSS!
// - Zero-Knowledge Decryption: The 256-bit AES master vaultKey lives ONLY
//   in React state (RAM). The backend never sees the master password or key.
// - Session Persistence: On initial mount, verifies active session with
//   GET /api/auth/me (using credentials: 'include').
// - Secure Logout: POST /api/auth/logout instructs the server to clear the
//   cookie header while clearing client state.
// ============================================================================

import { useCallback, useState, useEffect } from "react"

import Manager from "./Component/Manger"
import Navbar from "./Component/NavBar"
import Footer from "./Component/Footer"
import Auth from "./Component/Auth"
import LandingPage from "./Component/LandingPage"
import LockScreenModal from "./Component/LockScreenModal"
import VaultSendModal from "./Component/VaultSendModal"
import VaultSendViewer from "./Component/VaultSendViewer"

import { useSmoothScroll } from "./hooks/useSmoothScroll"
import { deriveVaultKey, clearCachedVaultKey } from "./utils/cryptoVault"
import { useAutoLock } from "./hooks/useAutoLock"
import { secureFetch, setCsrfToken } from "./utils/csrf"

const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL ?? "http://localhost:3000/api/auth";

function App() {
  useSmoothScroll();

  // --------------------------------------------------------------------------
  // SESSION STATE
  // token: fallback in RAM for non-cookie environments
  // user: verified user profile
  // --------------------------------------------------------------------------
  const [session, setSession] = useState(() => ({
    token: null,
    user: JSON.parse(localStorage.getItem("passvault_user") || "null"),
  }))

  const [vaultKey, setVaultKey] = useState(null)
  const [activeView, setActiveView] = useState(() => (session.user ? "vault" : "landing"))
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState("login")
  const [isPasswordRevealed, setIsPasswordRevealed] = useState(false)

  // --------------------------------------------------------------------------
  // PASSVAULT SEND STATES
  // --------------------------------------------------------------------------
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [sendInitialData, setSendInitialData] = useState(null)
  const [activeSendShare, setActiveSendShare] = useState(() => {
    // Detect if page was opened via a Send secret link: #sendId=...&key=...
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const sendId = params.get("sendId");
      const key = params.get("key");
      if (sendId && key) {
        return { sendId, key };
      }
    }
    return null;
  })

  // Hash listener for when user navigates or clicks a Send link while app is already open
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash) {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const sendId = params.get("sendId");
        const key = params.get("key");
        if (sendId && key) {
          setActiveSendShare({ sendId, key });
        }
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleOpenSend = useCallback((data = null) => {
    setSendInitialData(data);
    setSendModalOpen(true);
  }, []);

  const handleDismissSendViewer = useCallback(() => {
    setActiveSendShare(null);
    if (window.location.hash.includes("sendId")) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  // --------------------------------------------------------------------------
  // THEME SYSTEM (Obsidian Cyberpunk Dark / Warm Cream Light)
  // --------------------------------------------------------------------------
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("passvault_theme");
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("passvault_theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  // --------------------------------------------------------------------------
  // AUTO-LOCK SYSTEM
  // Inactivity tracking when authenticated and in the vault
  // --------------------------------------------------------------------------
  const { isLocked, lockVault, unlockVault } = useAutoLock(Boolean(session.user && activeView === "vault"))

  // --------------------------------------------------------------------------
  // VALIDATE ACTIVE HTTPONLY SESSION COOKIE ON MOUNT
  // --------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      try {
        const response = await secureFetch(`${AUTH_API_URL}/me`);

        if (response.ok) {
          const data = await response.json();
          if (data.csrfToken) {
            setCsrfToken(data.csrfToken);
          }
          if (isMounted && data.user) {
            setSession(prev => ({ ...prev, user: data.user }));
            localStorage.setItem("passvault_user", JSON.stringify(data.user));
            setActiveView("vault");
          }
        } else if (response.status === 401) {
          // Cookie expired or absent
          if (isMounted) {
            setSession({ token: null, user: null });
            localStorage.removeItem("passvault_user");
            setActiveView("landing");
          }
        }
      } catch {
        // Backend offline or unreachable - retain offline session state
      }
    };

    void verifySession();

    return () => {
      isMounted = false;
    };
  }, []);

  // --------------------------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------------------------

  // A. Login / Registration Success
  const handleAuthenticated = useCallback((data) => {
    if (data.csrfToken) {
      setCsrfToken(data.csrfToken);
    }
    localStorage.setItem("passvault_user", JSON.stringify(data.user));
    setSession({ token: data.token || null, user: data.user });
    if (data.vaultKey) {
      setVaultKey(data.vaultKey);
    }
    setAuthModalOpen(false);
    setActiveView("vault");
  }, []);

  // B. Logout (Clears HttpOnly Cookie & CSRF Cookie on Server + Clears RAM)
  const handleLogout = useCallback(async () => {
    try {
      await secureFetch(`${AUTH_API_URL}/logout`, {
        method: "POST",
      });
    } catch {
      // Ignore network errors on logout
    }
    localStorage.removeItem("passvault_user");
    clearCachedVaultKey();
    setVaultKey(null);
    setSession({ token: null, user: null });
    setActiveView("landing");
  }, []);

  // C. Open Auth Modal
  const handleOpenAuth = useCallback((mode = "login") => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }, []);

  // D. Master Password Unlock for Lock Screen / Refresh
  const handleUnlockWithMasterPassword = useCallback(async (masterPassword) => {
    if (!session.user?.email) {
      throw new Error('User email not found. Please log in again.');
    }
    try {
      const newVaultKey = await deriveVaultKey(masterPassword, session.user.email);
      setVaultKey(newVaultKey);
    } catch {
      throw new Error('Failed to derive vault key. Please check your master password.');
    }
  }, [session.user?.email]);

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------
  return (
    <div className={`composition-shell flex min-h-screen flex-col ${theme === "dark" ? "bg-[#0b0f17] text-[#e6edf3]" : "bg-[#f4f1ec] text-[#1f2933]"} antialiased transition-colors duration-300`}>
      {/* Ambient background decorative effects */}
      <div className="vault-grid" aria-hidden="true"></div>
      <div className="ambient-orbit ambient-orbit-one" aria-hidden="true"></div>
      <div className="ambient-orbit ambient-orbit-two" aria-hidden="true"></div>
      <div className="signal-line" aria-hidden="true"></div>

      {/* Top Navigation Bar */}
      <Navbar
        user={session.user}
        onLogout={handleLogout}
        onOpenAuth={handleOpenAuth}
        onLockVault={lockVault}
        onOpenSend={handleOpenSend}
        activeView={activeView}
        setActiveView={setActiveView}
        isPasswordRevealed={isPasswordRevealed}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main content area */}
      <div className="relative z-10 flex-1">
        {session.user && activeView === "vault" ? (
          <Manager
            token={session.token}
            vaultKey={vaultKey}
            onUnauthorized={handleLogout}
            onPasswordRevealChange={setIsPasswordRevealed}
            onOpenSend={handleOpenSend}
            theme={theme}
          />
        ) : (
          <LandingPage
            onOpenAuth={handleOpenAuth}
          />
        )}
      </div>

      {/* PassVault Send Modal (Creation & Management) */}
      <VaultSendModal
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        initialData={sendInitialData}
        token={session.token}
        theme={theme}
      />

      {/* PassVault Send Decryption & Reveal Modal (Link Viewer) */}
      {activeSendShare && (
        <VaultSendViewer
          sendId={activeSendShare.sendId}
          keyHex={activeSendShare.key}
          onDismiss={handleDismissSendViewer}
          theme={theme}
        />
      )}

      {/* Authentication Modal */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f2933]/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md">
            <Auth
              onAuthenticated={handleAuthenticated}
              initialMode={authModalMode}
              onClose={() => setAuthModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Inactivity Auto-Lock PIN Screen */}
      <LockScreenModal
        isOpen={(isLocked || (!vaultKey && activeView === "vault")) && Boolean(session.user)}
        user={session.user}
        onUnlock={unlockVault}
        onLogout={handleLogout}
        onUnlockWithMasterPassword={handleUnlockWithMasterPassword}
      />

      {/* Footer */}
      <Footer theme={theme} />
    </div>
  )
}

export default App
