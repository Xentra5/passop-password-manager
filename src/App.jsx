import { useCallback, useState } from "react"
import Manager from "./Component/Manger"
import Navbar from "./Component/NavBar"
import Footer from "./Component/Footer"
import Auth from "./Component/Auth"
import LandingPage from "./Component/LandingPage"
import { useSmoothScroll } from "./hooks/useSmoothScroll"

function App() {
  // Lenis smooth scrolling — disabled automatically when prefers-reduced-motion is set
  useSmoothScroll();

  const [session, setSession] = useState(() => ({
    token: localStorage.getItem("passvault_token"),
    user: JSON.parse(localStorage.getItem("passvault_user") || "null"),
  }))

  const [activeView, setActiveView] = useState(() => (session.token ? "vault" : "landing"))
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState("login")
  const [isPasswordRevealed, setIsPasswordRevealed] = useState(false)

  const handleAuthenticated = useCallback((data) => {
    localStorage.setItem("passvault_token", data.token)
    localStorage.setItem("passvault_user", JSON.stringify(data.user))
    setSession({ token: data.token, user: data.user })
    setAuthModalOpen(false)
    setActiveView("vault")
  }, [])

  const handleLogout = useCallback(() => {
    localStorage.removeItem("passvault_token")
    localStorage.removeItem("passvault_user")
    setSession({ token: null, user: null })
    setActiveView("landing")
  }, [])

  const handleOpenAuth = useCallback((mode = "login") => {
    setAuthModalMode(mode)
    setAuthModalOpen(true)
  }, [])

  return (
    <div className="composition-shell flex min-h-screen flex-col bg-[#f4f1ec] text-[#1f2933] antialiased">
      <div className="vault-grid" aria-hidden="true"></div>
      <div className="ambient-orbit ambient-orbit-one" aria-hidden="true"></div>
      <div className="ambient-orbit ambient-orbit-two" aria-hidden="true"></div>
      <div className="signal-line" aria-hidden="true"></div>

      <Navbar
        user={session.user}
        onLogout={handleLogout}
        onOpenAuth={handleOpenAuth}
        activeView={activeView}
        setActiveView={setActiveView}
        isPasswordRevealed={isPasswordRevealed}
      />

      <div className="relative z-10 flex-1">
        {session.token && activeView === "vault" ? (
          <Manager
            token={session.token}
            onUnauthorized={handleLogout}
            onPasswordRevealChange={setIsPasswordRevealed}
          />
        ) : (
          <LandingPage onOpenAuth={handleOpenAuth} />
        )}
      </div>

      {/* Auth Modal Overlay */}
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

      <Footer />
    </div>
  )
}

export default App

