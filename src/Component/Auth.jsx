import { useState, useEffect } from "react"
import { toast, Bounce } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { createKdfSalt, deriveVaultKey, getStoredKdfSalt, encryptCredential, decryptCredential } from "../utils/cryptoVault"
import { secureFetch, setCsrfToken, getCsrfToken } from "../utils/csrf"
import { validateRecoveryKey, decryptEmergencyRescueBlob, importRawVaultKey } from "../utils/recoveryKit"
import { logAuditEvent, AUDIT_CATEGORIES, AUDIT_EVENT_TYPES } from "../utils/auditLogger"

// BUG #6 FIX: Use env variable so production deploys use HTTPS.
// Set VITE_AUTH_API_URL=https://your-domain.com/api/auth in .env
const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL ?? "http://localhost:3000/api/auth"


// ============================================================================
// COMPONENT: Auth
// Handles Login, Register, and Emergency Vault Recovery.
// ============================================================================
const Auth = ({ onAuthenticated, initialMode = "login", onClose }) => {
  const [isRegistering, setIsRegistering] = useState(initialMode === "register")
  const [isRecovering, setIsRecovering] = useState(false)
  const [recoveryStep, setRecoveryStep] = useState(1) // 1: verify key, 2: set new password
  const [recoveryWords, setRecoveryWords] = useState("")
  const [newMasterPassword, setNewMasterPassword] = useState("")
  const [confirmNewMasterPassword, setConfirmNewMasterPassword] = useState("")
  // Stores the recovered vault key (CryptoKey) across recovery steps for credential re-encryption
  const [recoveredVaultKey, setRecoveredVaultKey] = useState(null)

  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [authError, setAuthError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Warm up the CSRF token on mount so it's ready for login/registration
  useEffect(() => {
    void getCsrfToken();
  }, []);

  // ==========================================================================
  // FUNCTION: handleChange
  // Triggered every time the user types a character in ANY input box.
  // - event.target.name:  "email", "password", or "confirmPassword"
  // - event.target.value: the new text inside that box
  // - ...previous: copies all existing fields so other inputs don't get erased
  // ==========================================================================
  const handleChange = (event) => {
    setAuthError("")
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
      // BUG #15 FIX: 12-char minimum — master password IS the encryption key material
      if (form.password.length < 12) {
        toast.error("Master password must be at least 12 characters", { theme: "dark" })
        return
      }
      if (form.password !== form.confirmPassword) {
        toast.error("Passwords do not match", { theme: "dark" })
        return // Stop right here, do not call backend
      }
    }

    // 3. Turn on loading state (changes button text to "Please wait..." and freezes it)
    setIsSubmitting(true)
    setAuthError("")

    try {
      // ----------------------------------------------------------------------
      // THE PAYLOAD: The actual data cargo to ship across the network.
      // - If isRegistering is TRUE: send email, password, AND confirmPassword
      // - If isRegistering is FALSE (login): send ONLY email and password
      // ----------------------------------------------------------------------
      const vaultSalt = isRegistering ? createKdfSalt() : getStoredKdfSalt()
      const payload = {
        email: form.email,
        password: form.password,
        ...(isRegistering ? { confirmPassword: form.confirmPassword } : {}),
        ...(vaultSalt ? { vaultSalt } : {}),
      }

      // 4. Send HTTP POST request via secureFetch with Anti-CSRF protection & HttpOnly cookie:
      const response = await secureFetch(`${AUTH_API_URL}/${isRegistering ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), // Convert the JS object into a JSON string
      })
      const data = await response.json() // Parse backend JSON reply into a JS object

      // 5. If server responded with an error (e.g. wrong password, email already exists):
      if (!response.ok) {
        throw new Error(data.message || "Authentication failed")
      }

      // Update CSRF token from login/register response
      if (data.csrfToken) {
        setCsrfToken(data.csrfToken);
      }

      // 6. Zero-Knowledge: Derive 256-bit AES vault key in the browser from master password & email
      if (!data.vaultSalt) {
        throw new Error("This account has no synced vault salt. Sign in on the device where the vault was created to migrate it.")
      }
      const vaultKey = await deriveVaultKey(form.password, form.email, data.vaultSalt)

      // 7. Success! Pass user, token, & vaultKey data to App.jsx to unlock the vault
      onAuthenticated({ ...data, user: { ...data.user, vaultSalt: data.vaultSalt }, vaultKey })
      toast.success(isRegistering ? "Account created" : "Welcome back", {
        theme: "dark",
        transition: Bounce,
        autoClose: 2000,
      })
    } catch (error) {
      // 7. Display any error message as a dark red toast notification
      const message = error instanceof Error && error.message
        ? error.message
        : "Unable to reach the authentication server. Make sure the backend is running."
      setAuthError(message)
      toast.error(message, { theme: "dark" })
    } finally {
      // 8. ALWAYS runs at the end: re-enable the submit button
      setIsSubmitting(false)
    }
  }

  // ==========================================================================
  // RECOVERY HANDLERS (Emergency Vault Recovery Kit)
  // ==========================================================================
  const handleVerifyRecoveryKey = async (e) => {
    e.preventDefault()
    if (!form.email || !form.email.includes("@")) {
      setAuthError("Please enter your account email.")
      return
    }
    if (!recoveryWords.trim()) {
      setAuthError("Please enter your 24 emergency recovery words.")
      return
    }

    setIsSubmitting(true)
    setAuthError("")

    try {
      const val = await validateRecoveryKey(recoveryWords)
      if (!val.valid) {
        throw new Error(val.error || "Invalid 24-word recovery key.")
      }

      const res = await secureFetch(`${AUTH_API_URL}/recover-init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || "No emergency recovery kit registered for this account.")
      }

      const rawVaultBytes = await decryptEmergencyRescueBlob(
        data.emergencyRescueBlob,
        recoveryWords,
        data.vaultSalt
      )

      const restoredKey = await importRawVaultKey(rawVaultBytes)
      if (!restoredKey) {
        throw new Error("Failed to reconstruct vault key from rescue payload.")
      }
      // Store recovered key so handleCompleteRecovery can re-encrypt existing passwords
      setRecoveredVaultKey(restoredKey)
      setRecoveryStep(2)
      toast.success("Emergency key verified! Choose a new master password.", { theme: "dark" })
    } catch (err) {
      setAuthError(err.message || "Recovery key verification failed.")
      toast.error(err.message || "Recovery key verification failed.", { theme: "dark" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCompleteRecovery = async (e) => {
    e.preventDefault()
    if (newMasterPassword.length < 12) {
      setAuthError("New master password must be at least 12 characters.")
      return
    }
    if (newMasterPassword !== confirmNewMasterPassword) {
      setAuthError("Passwords do not match.")
      return
    }

    setIsSubmitting(true)
    setAuthError("")

    try {
      const newSalt = createKdfSalt()
      const newKey = await deriveVaultKey(newMasterPassword, form.email, newSalt)

      // Re-encrypt all existing vault credentials with the new vault key
      let reencryptedPasswords = []
      if (recoveredVaultKey) {
        try {
          const pwRes = await secureFetch("/api/passwords", { method: "GET" })
          if (pwRes.ok) {
            const pwData = await pwRes.json()
            const passwords = pwData.passwords || pwData || []
            reencryptedPasswords = await Promise.all(
              passwords.map(async (cred) => {
                try {
                  const plainText = await decryptCredential(cred.password, recoveredVaultKey)
                  const newCiphertext = await encryptCredential(plainText, newKey)
                  const reencryptedCustomFields = Array.isArray(cred.customFields)
                    ? await Promise.all(
                        cred.customFields.map(async (field) => ({
                          ...field,
                          value: field.value
                            ? await encryptCredential(await decryptCredential(field.value, recoveredVaultKey), newKey).catch(() => field.value)
                            : field.value,
                        }))
                      )
                    : []
                  return { id: cred.id, password: newCiphertext, customFields: reencryptedCustomFields }
                } catch {
                  // If a credential can't be re-encrypted, skip it (don't block full recovery)
                  return null
                }
              })
            )
            reencryptedPasswords = reencryptedPasswords.filter(Boolean)
          }
        } catch {
          // Non-fatal: proceed with recovery even if re-encryption fetch fails
        }
      }

      const res = await secureFetch(`${AUTH_API_URL}/recover-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          newPassword: newMasterPassword,
          newVaultSalt: newSalt,
          passwords: reencryptedPasswords,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || "Failed to finalize recovery.")
      }

      if (data.csrfToken) {
        setCsrfToken(data.csrfToken)
      }

      logAuditEvent(form.email, {
        type: AUDIT_EVENT_TYPES.VAULT_RECOVERED,
        title: "Vault Recovered with Emergency Kit",
        description: "Account restored and re-keyed with new master password.",
        severity: "success",
        category: AUDIT_CATEGORIES.SECURITY,
      })

      onAuthenticated({ ...data, user: { ...data.user, vaultSalt: newSalt }, vaultKey: newKey })
      toast.success("Vault restored successfully! Welcome back.", {
        theme: "dark",
        transition: Bounce,
      })
    } catch (err) {
      setAuthError(err.message || "Failed to finalize recovery.")
      toast.error(err.message || "Failed to finalize recovery.", { theme: "dark" })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ==========================================================================
  // RENDER (JSX / UI)
  // ==========================================================================
  if (isRecovering) {
    return (
      <div className="auth-composition compact-auth-composition flex items-center justify-center py-2">
        <section className="auth-panel compact-auth-panel relative z-10 w-full max-w-md rounded-2xl border border-white/20 bg-black p-6 text-white shadow-2xl sm:p-8">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="absolute right-4 top-4 rounded-md p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                {recoveryStep === 1 ? '1' : '2'}
              </span>
              <h1 className="font-['Space_Grotesk'] text-2xl font-bold text-white">
                {recoveryStep === 1 ? "Emergency Recovery" : "Set New Master Password"}
              </h1>
            </div>
            <p className="text-xs leading-relaxed text-white/65">
              {recoveryStep === 1
                ? "Enter your account email and the 24 words from your printable Emergency Kit."
                : "Your recovery key was verified. Choose a secure new master password to re-encrypt your vault."}
            </p>
          </div>

          {recoveryStep === 1 ? (
            <form onSubmit={handleVerifyRecoveryKey} className="space-y-4">
              <div>
                <label htmlFor="recover-email" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/75">
                  Account Email
                </label>
                <input
                  id="recover-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  placeholder="you@domain.com"
                  className="auth-field w-full rounded-md border border-white/35 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white"
                />
              </div>

              <div>
                <label htmlFor="recover-words" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/75">
                  24-Word Recovery Key
                </label>
                <textarea
                  id="recover-words"
                  rows={4}
                  value={recoveryWords}
                  onChange={(e) => setRecoveryWords(e.target.value)}
                  required
                  placeholder="Paste or type your 24 emergency recovery words separated by spaces..."
                  className="auth-field w-full rounded-md border border-white/35 bg-black p-3 text-xs font-mono text-white outline-none focus:border-white"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="auth-submit w-full rounded-md bg-emerald-500 px-4 py-2.5 text-sm font-bold text-black shadow-sm transition hover:bg-emerald-400 disabled:opacity-60"
              >
                {isSubmitting ? "Verifying..." : "Verify Emergency Key"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsRecovering(false)
                  setRecoveryStep(1)
                  setAuthError("")
                  setRecoveredVaultKey(null)
                  setRecoveryWords("")
                }}
                className="w-full text-xs font-semibold text-white/70 hover:text-white"
              >
                ← Back to Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleCompleteRecovery} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/75">
                  New Master Password
                </label>
                <input
                  type="password"
                  value={newMasterPassword}
                  onChange={(e) => setNewMasterPassword(e.target.value)}
                  minLength={12}
                  required
                  placeholder="Min 12 characters"
                  className="auth-field w-full rounded-md border border-white/35 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/75">
                  Confirm New Master Password
                </label>
                <input
                  type="password"
                  value={confirmNewMasterPassword}
                  onChange={(e) => setConfirmNewMasterPassword(e.target.value)}
                  minLength={12}
                  required
                  placeholder="Re-enter new password"
                  className="auth-field w-full rounded-md border border-white/35 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="auth-submit w-full rounded-md bg-emerald-500 px-4 py-2.5 text-sm font-bold text-black shadow-sm transition hover:bg-emerald-400 disabled:opacity-60"
              >
                {isSubmitting ? "Restoring..." : "Restore Vault & Sign In"}
              </button>

              <button
                type="button"
                onClick={() => setRecoveryStep(1)}
                className="w-full text-xs font-semibold text-white/70 hover:text-white"
              >
                ← Back to Step 1
              </button>
            </form>
          )}

          {authError && (
            <p role="alert" className="mt-4 rounded-md border border-red-300/50 bg-red-950/60 px-3 py-2 text-xs font-medium text-red-100">
              {authError}
            </p>
          )}
        </section>
      </div>
    )
  }
  return (
    <div className="auth-composition compact-auth-composition flex items-center justify-center py-2">
      <div className="auth-signal" aria-hidden="true"></div>

      {/* Main Auth Card */}
      <section className="auth-panel compact-auth-panel relative z-10 w-full max-w-[560px] rounded-2xl border border-white/20 bg-black text-white shadow-2xl">

        {/* Close Button ('X' icon) */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute right-6 top-6 rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Header Section (Title and Subtitle) */}
        <div className="mb-6">
          {/* DYNAMIC TITLE:
              If isRegistering is true  -> "Create your vault"
              If isRegistering is false -> "Open your vault" */}
          <h1 className="font-['Space_Grotesk'] text-2xl font-bold text-white">
            {isRegistering ? "Create your vault" : "Open your vault"}
          </h1>

          {/* DYNAMIC SUBTITLE: changes explanation text based on mode */}
          <p className="mt-2 text-sm leading-relaxed text-white/65">
            {isRegistering
              ? "Create an account to keep your credentials private."
              : "Sign in to access your saved credentials."}
          </p>
        </div>

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* FIELD 1: EMAIL INPUT (Used by BOTH Login and Sign Up) */}
          <div>
            <label htmlFor="auth-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/75">
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
              className="auth-field w-full rounded-md border border-white/35 bg-black px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/45 focus:border-white focus:ring-1 focus:ring-white/30"
            />
          </div>

          {/* FIELD 2: PASSWORD INPUT (Used by BOTH Login and Sign Up) */}
          <div>
            <label htmlFor="auth-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/75">
              Password
            </label>
            <div className="auth-password-field">
              <input
                id="auth-password"
                name="password"
                type={showPassword ? "text" : "password"}
                enterKeyHint="done"
                autoComplete={isRegistering ? "new-password" : "current-password"}
                minLength={isRegistering ? 12 : undefined}
                value={form.password}
                onChange={handleChange}
                required
                className="auth-field w-full rounded-md border border-white/35 bg-black px-3 py-2.5 pr-11 text-sm text-white outline-none transition placeholder:text-white/45 focus:border-white focus:ring-1 focus:ring-white/30"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeIcon /> : <EyeSlashIcon />}
              </button>
            </div>
            {/* Helper text shown ONLY on register */}
            {isRegistering && <p className="mt-1.5 text-xs text-white/55">Use at least 12 characters (master password is your encryption key).</p>}

            {!isRegistering && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsRecovering(true)
                    setRecoveryStep(1)
                    setAuthError("")
                  }}
                  className="text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:underline transition"
                >
                  Forgot Master Password?
                </button>
              </div>
            )}
          </div>

          {/* FIELD 3: CONFIRM PASSWORD INPUT */}
          {isRegistering && (
            <div>
              <label htmlFor="auth-confirm-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/75">
                Confirm Password
              </label>
              <div className="auth-password-field">
                <input
                  id="auth-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  enterKeyHint="done"
                  autoComplete="new-password"
                  minLength={8}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required={isRegistering}
                  placeholder="Re-enter your password"
                  className={`auth-field w-full rounded-md border bg-black px-3 py-2.5 pr-11 text-sm text-white outline-none transition focus:ring-1 ${form.confirmPassword && form.password !== form.confirmPassword
                      ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                      : form.confirmPassword && form.password === form.confirmPassword
                        ? "border-white focus:border-white focus:ring-white/30"
                        : "border-white/35 focus:border-white focus:ring-white/30"
                    }`}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                  aria-label={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"}
                  aria-pressed={showConfirmPassword}
                >
                  {showConfirmPassword ? <EyeIcon /> : <EyeSlashIcon />}
                </button>
              </div>

              {/* Real-time mismatch feedback in red */}
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="mt-1.5 text-xs text-red-500 font-medium">Passwords do not match.</p>
              )}

              {/* Real-time match feedback */}
              {form.confirmPassword && form.password === form.confirmPassword && (
                <p className="mt-1.5 text-xs text-white/75 font-medium">✓ Passwords match</p>
              )}
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="auth-submit w-full rounded-md bg-white px-4 py-2.5 text-sm font-bold text-black shadow-sm transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Please wait..." : isRegistering ? "Create account" : "Sign in"}
          </button>
        </form>

        {authError && (
          <p role="alert" className="mt-4 rounded-md border border-red-300/50 bg-red-950/60 px-3 py-2 text-xs font-medium leading-relaxed text-red-100">
            {authError}
          </p>
        )}

        {/* BOTTOM TOGGLE BUTTON */}
        <button
          type="button"
          onClick={() => {
            setIsRegistering(previous => !previous)
            setForm(previous => ({ ...previous, confirmPassword: "" }))
          }}
          className="mt-5 w-full text-xs font-semibold text-white/75 hover:text-white hover:underline"
        >
          {isRegistering ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </section>
    </div>
  )
}

export default Auth

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  )
}

function EyeSlashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 3 18 18M10.6 6.2A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3 3.6M6.3 6.8C3.9 8.6 2.5 12 2.5 12s3.5 6 9.5 6c1 0 1.9-.2 2.7-.5" />
    </svg>
  )
}
