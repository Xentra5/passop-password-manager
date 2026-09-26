import { useState } from "react"
import { ToastContainer, toast, Bounce } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import PassVaultLogo from "./PassVaultLogo"

// The backend API base address for all authentication routes
const AUTH_API_URL = "http://localhost:3000/api/auth"

// ============================================================================
// COMPONENT: Auth
// This single modal handles BOTH "Login" (Sign In) and "Register" (Sign Up).
//
// PROPS:
// - onAuthenticated: Function called when login/signup succeeds (saves token)
// - initialMode: "login" or "register" (passed from Navbar or Landing Page buttons)
// - onClose: Function to close the modal when clicking the 'X' button
// ============================================================================
const Auth = ({ onAuthenticated, initialMode = "login", onClose }) => {

  // --------------------------------------------------------------------------
  // STATE 1: isRegistering
  // - TRUE  = User is on "Sign Up / Create Account" mode.
  // - FALSE = User is on "Sign In / Login" mode.
  // It starts based on initialMode: ("register" === "register" -> true, else false)
  // --------------------------------------------------------------------------
  const [isRegistering, setIsRegistering] = useState(initialMode === "register")

  // --------------------------------------------------------------------------
  // STATE 2: form
  // Holds all the text currently typed into the input fields in browser memory.
  // - email: user's email address
  // - password: user's password
  // - confirmPassword: confirmation password (only used during registration)
  // --------------------------------------------------------------------------
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "" })

  // --------------------------------------------------------------------------
  // STATE 3: isSubmitting
  // Loading spinner/lock state:
  // - TRUE  = Currently waiting for backend server response (disables button)
  // - FALSE = Idle, user can click buttons
  // --------------------------------------------------------------------------
  const [isSubmitting, setIsSubmitting] = useState(false)

  // --------------------------------------------------------------------------
  // STATE 4: lastInitialMode
  // Remembers the last mode. If the user clicks a navbar button with a new mode
  // (e.g. clicks "Sign In" while modal was on "Register"), this syncs it up.
  // --------------------------------------------------------------------------
  const [lastInitialMode, setLastInitialMode] = useState(initialMode)

  if (initialMode !== lastInitialMode) {
    setLastInitialMode(initialMode)
    setIsRegistering(initialMode === "register")
    setForm({ email: "", password: "", confirmPassword: "" })
  }

  // ==========================================================================
  // FUNCTION: handleChange
  // Triggered every time the user types a character in ANY input box.
  // - event.target.name:  "email", "password", or "confirmPassword"
  // - event.target.value: the new text inside that box
  // - ...previous: copies all existing fields so other inputs don't get erased
  // ==========================================================================
  const handleChange = (event) => {
    setForm(previous => ({ ...previous, [event.target.name]: event.target.value }))
  }

  // ==========================================================================
  // FUNCTION: handleSubmit
  // Triggered when the user submits the form (clicks "Sign in" or "Create account").
  // ==========================================================================
  const handleSubmit = async (event) => {
    // 1. Stop the default HTML browser behavior (which would reload the entire page)
    event.preventDefault()

    // 2. Client-side validation: ONLY check password rules when registering!
    if (isRegistering) {
      if (form.password.length < 8) {
        toast.error("Password must be at least 8 characters", { theme: "dark" })
        return // Stop right here, do not call backend
      }
      if (form.password !== form.confirmPassword) {
        toast.error("Passwords do not match", { theme: "dark" })
        return // Stop right here, do not call backend
      }
    }

    // 3. Turn on loading state (changes button text to "Please wait..." and freezes it)
    setIsSubmitting(true)

    try {
      // ----------------------------------------------------------------------
      // THE PAYLOAD: The actual data cargo to ship across the network.
      // - If isRegistering is TRUE: send email, password, AND confirmPassword
      // - If isRegistering is FALSE (login): send ONLY email and password
      // ----------------------------------------------------------------------
      const payload = isRegistering
        ? { email: form.email, password: form.password, confirmPassword: form.confirmPassword }
        : { email: form.email, password: form.password }

      // 4. Send HTTP POST request to the backend:
      //    URL becomes either:
      //    - http://localhost:3000/api/auth/register (when isRegistering is true)
      //    - http://localhost:3000/api/auth/login    (when isRegistering is false)
      const response = await fetch(`${AUTH_API_URL}/${isRegistering ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), // Convert the JS object into a JSON string
      })
      const data = await response.json() // Parse backend JSON reply into a JS object

      // 5. If server responded with an error (e.g. wrong password, email already exists):
      if (!response.ok) {
        throw new Error(data.message || "Authentication failed")
      }

      // 6. Success! Pass user & token data to App.jsx to unlock the vault
      onAuthenticated(data)
      toast.success(isRegistering ? "Account created" : "Welcome back", {
        theme: "dark",
        transition: Bounce,
        autoClose: 2000,
      })
    } catch (error) {
      // 7. Display any error message as a dark red toast notification
      toast.error(error.message, { theme: "dark" })
    } finally {
      // 8. ALWAYS runs at the end: re-enable the submit button
      setIsSubmitting(false)
    }
  }

  // ==========================================================================
  // RENDER (JSX / UI)
  // Whenever isRegistering or form changes, React re-renders this entire section!
  // ==========================================================================
  return (
    <main className="auth-composition flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      {/* Toast popup notification container */}
      <ToastContainer position="top-right" autoClose={2000} theme="dark" />
      <div className="auth-signal" aria-hidden="true"></div>

      {/* Main Auth Card */}
      <section className="auth-panel relative z-10 w-full max-w-md rounded-lg border border-[#ddd8d0] bg-white p-6 shadow-[0_10px_35px_rgba(56,45,32,0.06)] sm:p-8">
        
        {/* Close Button ('X' icon) */}
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

        {/* Header Section (Logo, Title, and Subtitle) */}
        <div className="mb-6">
          <div className="mb-3">
            <PassVaultLogo size="sm" />
          </div>

          {/* DYNAMIC TITLE:
              If isRegistering is true  -> "Create your vault"
              If isRegistering is false -> "Open your vault" */}
          <h1 className="mt-2 font-['Space_Grotesk'] text-2xl font-bold text-[#1f2933]">
            {isRegistering ? "Create your vault" : "Open your vault"}
          </h1>

          {/* DYNAMIC SUBTITLE: changes explanation text based on mode */}
          <p className="mt-2 text-sm leading-relaxed text-[#6f6a63]">
            {isRegistering
              ? "Create an account to keep your credentials private."
              : "Sign in to access your saved credentials."}
          </p>
        </div>

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* FIELD 1: EMAIL INPUT (Used by BOTH Login and Sign Up) */}
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

          {/* FIELD 2: PASSWORD INPUT (Used by BOTH Login and Sign Up) */}
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
            {/* Helper text shown ONLY on register */}
            {isRegistering && <p className="mt-1.5 text-xs text-[#7b746b]">Use at least 8 characters.</p>}
          </div>

          {/* 
            FIELD 3: CONFIRM PASSWORD INPUT
            Conditional rendering using && (Logical AND short-circuit):
            - When isRegistering is TRUE  -> Renders this entire confirm password box.
            - When isRegistering is FALSE -> Hides/removes this box completely (Login mode).
          */}
          {isRegistering && (
            <div>
              <label htmlFor="auth-confirm-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#6f6a63]">
                Confirm Password
              </label>
              <input
                id="auth-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={form.confirmPassword}
                onChange={handleChange}
                required={isRegistering}
                placeholder="Re-enter your password"
                /* Dynamic border color:
                   - Red outline if passwords do NOT match
                   - Green outline if passwords DO match
                   - Default gray outline if empty */
                className={`w-full rounded-md border bg-[#faf9f7] px-3 py-2.5 text-sm text-[#1f2933] outline-none transition focus:ring-1 ${
                  form.confirmPassword && form.password !== form.confirmPassword
                    ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                    : form.confirmPassword && form.password === form.confirmPassword
                    ? "border-emerald-500 focus:border-emerald-600 focus:ring-emerald-200"
                    : "border-[#d5d0c8] focus:border-[#176b87] focus:ring-[#176b87]/30"
                }`}
              />

              {/* Real-time mismatch feedback in red */}
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="mt-1.5 text-xs text-red-500 font-medium">Passwords do not match.</p>
              )}

              {/* Real-time match feedback in green */}
              {form.confirmPassword && form.password === form.confirmPassword && (
                <p className="mt-1.5 text-xs text-emerald-600 font-medium">✓ Passwords match</p>
              )}
            </div>
          )}

          {/* SUBMIT BUTTON:
              - disabled={isSubmitting}: prevents double-clicks while loading
              - Text changes dynamically:
                * "Please wait..." (when loading)
                * "Create account" (when isRegistering is true)
                * "Sign in"        (when isRegistering is false) */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-[#176b87] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#145d74] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Please wait..." : isRegistering ? "Create account" : "Sign in"}
          </button>
        </form>

        {/* 
          BOTTOM TOGGLE BUTTON:
          Flips between Sign In and Sign Up modes.
          - previous => !previous inverts the boolean: (false becomes true, true becomes false)
          - Also clears out confirmPassword so no leftover text remains.
        */}
        <button
          type="button"
          onClick={() => {
            setIsRegistering(previous => !previous) // FLIP the switch!
            setForm(previous => ({ ...previous, confirmPassword: "" }))
          }}
          className="mt-5 w-full text-xs font-semibold text-[#176b87] hover:underline"
        >
          {isRegistering ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </section>
    </main>
  )
}

export default Auth
