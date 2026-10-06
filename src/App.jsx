// ============================================================================
// APP.JSX - COMPLETE CODE WITH STEP-BY-STEP NUMBERED LOGIC COMMENTS
// ============================================================================

// 1. Import React hooks for memory, callbacks, and lifecycle
import { useCallback, useState, useEffect } from "react"

// 2. Import child components
import Manager from "./Component/Manger"                   // Password vault dashboard
import Navbar from "./Component/NavBar"                     // Top navigation bar
import Footer from "./Component/Footer"                     // Bottom footer
import Auth from "./Component/Auth"                         // Login & Register popup modal
import LandingPage from "./Component/LandingPage"           // Public welcome homepage
import LockScreenModal from "./Component/LockScreenModal"   // 4-digit PIN lock screen modal

// 3. Import custom hooks and cryptographic helpers
import { useSmoothScroll } from "./hooks/useSmoothScroll"                       // Kinetic smooth scrolling
import { getCachedVaultKey, clearCachedVaultKey } from "./utils/cryptoVault"    // RAM key management
import { useAutoLock } from "./hooks/useAutoLock"                               // Inactivity timer hook

function App() {
  // --------------------------------------------------------------------------
  // STEP 1: INITIALIZE SMOOTH SCROLLING
  // --------------------------------------------------------------------------
  useSmoothScroll(); // 1. Activates smooth momentum scrolling on the page

  // --------------------------------------------------------------------------
  // STEP 2: STATE VARIABLES (What React remembers in memory)
  // --------------------------------------------------------------------------
  // 1. Check browser's localStorage for existing saved login credentials:
  const [session, setSession] = useState(() => ({
    token: localStorage.getItem("passvault_token"),                    // 1. Read saved JWT token from disk
    user: JSON.parse(localStorage.getItem("passvault_user") || "null"), // 2. Read saved user profile from disk
  }))

  // 2. Secret 256-bit encryption key stored ONLY in volatile RAM (never sent to database):
  const [vaultKey, setVaultKey] = useState(null)                       // 3. Decryption key (null when locked)

  // 3. Decide which screen is visible: if token exists -> "vault", else -> "landing":
  const [activeView, setActiveView] = useState(() => (session.token ? "vault" : "landing")) // 4. Active screen view

  // 4. Modal visibility: true = open popup, false = hide popup:
  const [authModalOpen, setAuthModalOpen] = useState(false)            // 5. Popup open/closed status

  // 5. Modal tab mode: "login" or "signup":
  const [authModalMode, setAuthModalMode] = useState("login")          // 6. Which form to show inside popup

  // 6. Privacy guard: true if user clicked eye icon to unmask passwords:
  const [isPasswordRevealed, setIsPasswordRevealed] = useState(false)  // 7. Track if passwords are visible

  // --------------------------------------------------------------------------
  // STEP 3: INACTIVITY AUTO-LOCK SYSTEM
  // --------------------------------------------------------------------------
  // Monitors mouse & keyboard idle time while inside the vault:
  const { isLocked, lockVault, unlockVault } = useAutoLock(Boolean(session.token && activeView === "vault"))
  // 1. isLocked: boolean indicating if vault screen is locked
  // 2. lockVault: function to manually lock vault
  // 3. unlockVault: function to unlock with 4-digit PIN

  // --------------------------------------------------------------------------
  // STEP 4: RESTORE ENCRYPTION KEY ON PAGE RELOAD (F5)
  // --------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;                                              // 1. Safety flag to prevent memory leaks
    getCachedVaultKey().then(key => {                                  // 2. Check temporary session storage
      if (isMounted && key) {
        setVaultKey(key);                                              // 3. Restore key into React RAM memory!
      }
    });
    return () => {
      isMounted = false;                                               // 4. Clean up if component unmounts
    };
  }, []);

  // --------------------------------------------------------------------------
  // STEP 5: ACTION HANDLERS (Functions that run on user clicks)
  // --------------------------------------------------------------------------

  // A. When login or registration succeeds:
  const handleAuthenticated = useCallback((data) => {
    localStorage.setItem("passvault_token", data.token)                // 1. Save JWT token to browser disk
    localStorage.setItem("passvault_user", JSON.stringify(data.user))  // 2. Save user profile object to browser disk
    setSession({ token: data.token, user: data.user })                 // 3. Update React active session state
    if (data.vaultKey) {
      setVaultKey(data.vaultKey)                                       // 4. Store secret decryption key in RAM
    }
    setAuthModalOpen(false)                                            // 5. Close login/signup popup modal
    setActiveView("vault")                                             // 6. Switch screen from landing page to vault!
  }, [])

  // B. When user clicks "Logout":
  const handleLogout = useCallback(() => {
    localStorage.removeItem("passvault_token")                         // 1. Delete token from browser disk
    localStorage.removeItem("passvault_user")                          // 2. Delete user profile from browser disk
    clearCachedVaultKey()                                              // 3. Wipe encryption key from session cache
    setVaultKey(null)                                                  // 4. Reset encryption key in RAM back to empty
    setSession({ token: null, user: null })                            // 5. Reset React session state back to null
    setActiveView("landing")                                           // 6. Switch screen back to landing page!
  }, [])

  // C. When user clicks "Sign In" or "Get Started" to open popup:
  const handleOpenAuth = useCallback((mode = "login") => {
    setAuthModalMode(mode)                                             // 1. Set mode to "login" or "signup"
    setAuthModalOpen(true)                                             // 2. Open popup modal window
  }, [])

  // --------------------------------------------------------------------------
  // STEP 6: USER INTERFACE RENDERING (JSX)
  // --------------------------------------------------------------------------
  return (
    // 1. Master layout container (Full screen height, light paper background)
    <div className="composition-shell flex min-h-screen flex-col bg-[#f4f1ec] text-[#1f2933] antialiased">
      
      {/* 2. Ambient background decorative effects */}
      <div className="vault-grid" aria-hidden="true"></div>             {/* Geometric grid lines */}
      <div className="ambient-orbit ambient-orbit-one" aria-hidden="true"></div> {/* Top-left glow */}
      <div className="ambient-orbit ambient-orbit-two" aria-hidden="true"></div> {/* Bottom-right glow */}
      <div className="signal-line" aria-hidden="true"></div>           {/* Laser signal line */}

      {/* 3. Top Navigation Bar (Always visible) */}
      <Navbar
        user={session.user}                                            // 1. Pass user profile info
        onLogout={handleLogout}                                        // 2. Pass logout action
        onOpenAuth={handleOpenAuth}                                    // 3. Pass auth popup opener
        onLockVault={lockVault}                                        // 4. Pass manual PIN lock function
        activeView={activeView}                                        // 5. Pass current view name
        setActiveView={setActiveView}                                  // 6. Pass tab switcher function
        isPasswordRevealed={isPasswordRevealed}                        // 7. Pass unmasked password warning
      />

      {/* 4. Main Page Area: dynamically switches between Vault Dashboard and Landing Page */}
      <div className="relative z-10 flex-1">
        {session.token && activeView === "vault" ? (
          // IF logged in & view is "vault" -> RENDER PASSWORD MANAGER DASHBOARD:
          <Manager
            token={session.token}                                      // 1. Pass JWT token for API calls
            vaultKey={vaultKey}                                        // 2. Pass RAM key to decrypt passwords
            onUnauthorized={handleLogout}                              // 3. Auto-logout if token expires
            onPasswordRevealChange={setIsPasswordRevealed}             // 4. Track if password eye icon clicked
          />
        ) : (
          // OTHERWISE -> RENDER PUBLIC LANDING PAGE:
          <LandingPage
            onOpenAuth={handleOpenAuth}                                // 1. Allow CTA buttons to open auth popup
          />
        )}
      </div>

      {/* 5. Authentication Modal: pops up when clicking Sign In or Register */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f2933]/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md">
            <Auth
              onAuthenticated={handleAuthenticated}                    // 1. Callback when login succeeds
              initialMode={authModalMode}                              // 2. "login" or "register"
              onClose={() => setAuthModalOpen(false)}                  // 3. Close popup when clicking 'X'
            />
          </div>
        </div>
      )}

      {/* 6. Inactivity Auto-Lock PIN Screen: pops up after idle timeout */}
      <LockScreenModal
        isOpen={isLocked && Boolean(session.token)}                    // 1. Show only if locked & logged in
        user={session.user}                                            // 2. Display user's email
        onUnlock={unlockVault}                                         // 3. Unlock screen on correct PIN
        onLogout={handleLogout}                                        // 4. Allow logout from lock screen
      />

      {/* 7. Bottom Footer */}
ss      <Footer />
    </div>
  )
}

export default App
