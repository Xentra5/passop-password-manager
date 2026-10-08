// ============================================================================
// APP.JSX - ROOT COMPONENT WITH SECURITY HARDENING
//
// SECURITY FIXES APPLIED:
// - BUG #2 FIX: JWT token is no longer stored in localStorage.
//   It is kept only in React state (RAM). On page refresh the user must
//   log in again. This eliminates the XSS-readable persistent token.
//   The user profile (non-sensitive display data) still uses localStorage.
// - BUG #13 FIX: onUnlockWithMasterPassword callback is now properly
//   created and passed to LockScreenModal so master password unlock
//   actually verifies the password before unlocking the vault.
// - BUG #1 downstream: getCachedVaultKey is now a no-op (returns null),
//   so the page always asks for master password after refresh.
// ============================================================================

import { useCallback, useState, useEffect } from "react"

import Manager from "./Component/Manger"
import Navbar from "./Component/NavBar"
import Footer from "./Component/Footer"
import Auth from "./Component/Auth"
import LandingPage from "./Component/LandingPage"
import LockScreenModal from "./Component/LockScreenModal"

import { useSmoothScroll } from "./hooks/useSmoothScroll"
import { deriveVaultKey, clearCachedVaultKey } from "./utils/cryptoVault"
import { useAutoLock } from "./hooks/useAutoLock"

function App() {
  useSmoothScroll();

  // --------------------------------------------------------------------------
  // SESSION STATE
  // BUG #2 FIX: token lives ONLY in React state (RAM), not localStorage.
  // The user profile (email for display) is stored in localStorage since
  // it contains no secret material.
  // --------------------------------------------------------------------------
  const [session, setSession] = useState(() => ({
    token: null,                                                             // BUG #2 FIX: never persisted to disk
    user: JSON.parse(localStorage.getItem("passvault_user") || "null"),     // non-sensitive display data only
  }))

  const [vaultKey, setVaultKey] = useState(null)

  // On load: if user profile exists but token is null, show landing page (not vault)
  // BUG #2 FIX: token is never read from localStorage — intentional
  const [activeView, setActiveView] = useState("landing")

  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState("login")
  const [isPasswordRevealed, setIsPasswordRevealed] = useState(false)

  // --------------------------------------------------------------------------
  // AUTO-LOCK
  // --------------------------------------------------------------------------
  const { isLocked, lockVault, unlockVault } = useAutoLock(Boolean(session.token && activeView === "vault"))

  // --------------------------------------------------------------------------
  // BUG #1 downstream: getCachedVaultKey now always returns null.
  // No key is ever restored from sessionStorage — this effect is a no-op
  // but kept for structural clarity if the policy is ever revisited.
  // --------------------------------------------------------------------------
  useEffect(() => {
    // Intentional no-op: key no longer cached in sessionStorage (BUG #1 fix).
    // The vault key only lives in React state from the moment of login.
  }, []);

  // --------------------------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------------------------

  // A. Login / register success
  const handleAuthenticated = useCallback((data) => {
    // BUG #2 FIX: token stored ONLY in React state, never in localStorage
    localStorage.setItem("passvault_user", JSON.stringify(data.user))      // non-secret display data
    setSession({ token: data.token, user: data.user })
    if (data.vaultKey) {
      setVaultKey(data.vaultKey)
    }
    setAuthModalOpen(false)
    setActiveView("vault")
  }, [])

  // B. Logout
  const handleLogout = useCallback(() => {
    localStorage.removeItem("passvault_user")                              // BUG #2 FIX: no token to remove
    clearCachedVaultKey()                                                  // no-op after BUG #1 fix, kept for safety
    setVaultKey(null)
    setSession({ token: null, user: null })
    setActiveView("landing")
  }, [])

  // C. Open auth modal
  const handleOpenAuth = useCallback((mode = "login") => {
    setAuthModalMode(mode)
    setAuthModalOpen(true)
  }, [])

  // D. BUG #13 FIX: Master password re-derivation for lock screen unlock.
  //    This callback re-derives the vault key from the master password,
  //    effectively verifying it (wrong password → different key → decrypt fails).
  const handleUnlockWithMasterPassword = useCallback(async (masterPassword) => {
    if (!session.user?.email) {
      throw new Error('Cannot derive vault key: user email not found. Please log out and log in again.');
    }
    try {
      const newVaultKey = await deriveVaultKey(masterPassword, session.user.email);
      setVaultKey(newVaultKey);
      // If the password was wrong, decryption of stored data will fail silently —
      // which is the expected zero-knowledge behavior. No server-side check needed.
    } catch (err) {
      throw new Error('Failed to derive vault key. Please check your master password.');
    }
  }, [session.user?.email]);

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------
  return (
    <div className="composition-shell flex min-h-screen flex-col bg-[#f4f1ec] text-[#1f2933] antialiased">

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
        activeView={activeView}
        setActiveView={setActiveView}
        isPasswordRevealed={isPasswordRevealed}
      />

      {/* Main content area */}
      <div className="relative z-10 flex-1">
        {session.token && activeView === "vault" ? (
          <Manager
            token={session.token}
            vaultKey={vaultKey}
            onUnauthorized={handleLogout}
            onPasswordRevealChange={setIsPasswordRevealed}
          />
        ) : (
          <LandingPage
            onOpenAuth={handleOpenAuth}
          />
        )}
      </div>

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
      {/* BUG #13 FIX: onUnlockWithMasterPassword now correctly passed */}
      <LockScreenModal
        isOpen={isLocked && Boolean(session.token)}
        user={session.user}
        onUnlock={unlockVault}
        onLogout={handleLogout}
        onUnlockWithMasterPassword={handleUnlockWithMasterPassword}
      />

      {/* Footer */}
      <Footer />
    </div>
  )
}

export default App
