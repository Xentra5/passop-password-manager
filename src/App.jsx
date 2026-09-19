import { useCallback, useState } from "react"
import Manager from "./Component/Manger"
import Navbar from "./Component/NavBar"
import Footer from "./Component/Footer"
import Auth from "./Component/Auth"

function App() {
  const [session, setSession] = useState(() => ({
    token: localStorage.getItem("passvault_token"),
    user: JSON.parse(localStorage.getItem("passvault_user") || "null"),
  }))

  const handleAuthenticated = useCallback((data) => {
    localStorage.setItem("passvault_token", data.token)
    localStorage.setItem("passvault_user", JSON.stringify(data.user))
    setSession({ token: data.token, user: data.user })
  }, [])

  const handleLogout = useCallback(() => {
    localStorage.removeItem("passvault_token")
    localStorage.removeItem("passvault_user")
    setSession({ token: null, user: null })
  }, [])

  return (
    <div className="composition-shell flex min-h-screen flex-col bg-[#f4f1ec] text-[#1f2933] antialiased">
      <div className="vault-grid" aria-hidden="true"></div>
      <div className="ambient-orbit ambient-orbit-one" aria-hidden="true"></div>
      <div className="ambient-orbit ambient-orbit-two" aria-hidden="true"></div>
      <div className="signal-line" aria-hidden="true"></div>
      <Navbar user={session.user} onLogout={handleLogout} />
      <div className="relative z-10 flex-1">
        {session.token ? (
          <Manager token={session.token} onUnauthorized={handleLogout} />
        ) : (
          <Auth onAuthenticated={handleAuthenticated} />
        )}
      </div>
      <Footer />
    </div>
  )
}

export default App

