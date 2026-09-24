import { useState } from "react"
import { ToastContainer, toast, Bounce } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import PassVaultLogo from "./PassVaultLogo"

const AUTH_API_URL = "http://localhost:3000/api/auth"

const Auth = ({ onAuthenticated, initialMode = "login", onClose }) => {
  const [isRegistering, setIsRegistering] = useState(initialMode === "register")
  const [form, setForm] = useState({ email: "", password: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastInitialMode, setLastInitialMode] = useState(initialMode)

  if (initialMode !== lastInitialMode) {
    setLastInitialMode(initialMode)
    setIsRegistering(initialMode === "register")
  }

  const handleChange = (event) => {
    setForm(previous => ({ ...previous, [event.target.name]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch(`${AUTH_API_URL}/${isRegistering ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed")
      }

      onAuthenticated(data)
      toast.success(isRegistering ? "Account created" : "Welcome back", {
        theme: "dark",
        transition: Bounce,
        autoClose: 2000,
      })
    } catch (error) {
      toast.error(error.message, { theme: "dark" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-composition flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <ToastContainer position="top-right" autoClose={2000} theme="dark" />
      <div className="auth-signal" aria-hidden="true"></div>
      <section className="auth-panel relative z-10 w-full max-w-md rounded-lg border border-[#ddd8d0] bg-white p-6 shadow-[0_10px_35px_rgba(56,45,32,0.06)] sm:p-8">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute right-4 top-4 rounded-md p-1.5 text-[#857e75] hover:bg-[#f0ede6] hover:text-[#1f2933]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <div className="mb-6">
          <div className="mb-3">
            <PassVaultLogo size="sm" />
          </div>
          <h1 className="mt-2 font-['Space_Grotesk'] text-2xl font-bold text-[#1f2933]">
            {isRegistering ? "Create your vault" : "Open your vault"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#6f6a63]">
            {isRegistering ? "Create an account to keep your credentials private." : "Sign in to access your saved credentials."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="auth-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#6f6a63]">
              Email
            </label>
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-[#d5d0c8] bg-[#faf9f7] px-3 py-2.5 text-sm text-[#1f2933] outline-none transition focus:border-[#176b87] focus:ring-1 focus:ring-[#176b87]/30"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#6f6a63]">
              Password
            </label>
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={isRegistering ? "new-password" : "current-password"}
              minLength={isRegistering ? 8 : undefined}
              value={form.password}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-[#d5d0c8] bg-[#faf9f7] px-3 py-2.5 text-sm text-[#1f2933] outline-none transition focus:border-[#176b87] focus:ring-1 focus:ring-[#176b87]/30"
            />
            {isRegistering && <p className="mt-1.5 text-xs text-[#7b746b]">Use at least 8 characters.</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-[#176b87] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#145d74] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Please wait..." : isRegistering ? "Create account" : "Sign in"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setIsRegistering(previous => !previous)}
          className="mt-5 w-full text-xs font-semibold text-[#176b87] hover:underline"
        >
          {isRegistering ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </section>
    </main>
  )
}

export default Auth
