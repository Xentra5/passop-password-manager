import { useState, useEffect, useId } from 'react'
import { ToastContainer, toast, Bounce } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { v4 as uuidv4 } from "uuid";

const API_BASE_URL = "http://localhost:3000/api/passwords"

const Manager = ({ token, onUnauthorized }) => {
  const [form, setForm] = useState({ site: "", username: "", password: "" })
  const [passwordArray, setPasswordArray] = useState([])
  const [showPassword, setShowPassword] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [copiedKey, setCopiedKey] = useState(null)
  const [revealedIds, setRevealedIds] = useState({})
  const [backendOnline, setBackendOnline] = useState(true)

  const siteInputId = useId()
  const usernameInputId = useId()
  const passwordInputId = useId()

  const authHeaders = () => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  useEffect(() => {
    const loadPasswords = async () => {
      try {
        const req = await fetch(API_BASE_URL, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        if (!req.ok) {
          if (req.status === 401) onUnauthorized()
          throw new Error(`Backend returned ${req.status}`)
        }
        const passwords = await req.json()
        setPasswordArray(passwords)
        setBackendOnline(true)
      } catch (error) {
        console.warn('Backend unavailable, using local session state:', error)
        setBackendOnline(false)
      }
    }

    void loadPasswords()
  }, [token, onUnauthorized])

  const generateStrongPassword = () => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-="
    const randomBuffer = new Uint32Array(16)
    crypto.getRandomValues(randomBuffer)
    let generated = ""
    for (let i = 0; i < 16; i++) {
      generated += charset[randomBuffer[i] % charset.length]
    }
    setForm(prev => ({ ...prev, password: generated }))
    setShowPassword(true)
    toast.success("Generated 16-character fortified password", {
      theme: "dark",
      transition: Bounce,
      autoClose: 2000,
    })
  }

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: "None", width: "w-0", color: "bg-slate-700" }
    let score = 0
    if (pwd.length >= 8) score++
    if (pwd.length >= 12) score++
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++

    if (score <= 2) return { score: 1, label: "Basic", width: "w-1/4", color: "bg-rose-500" }
    if (score <= 3) return { score: 2, label: "Moderate", width: "w-2/4", color: "bg-amber-500" }
    if (score === 4) return { score: 3, label: "Strong", width: "w-3/4", color: "bg-emerald-500" }
    return { score: 4, label: "Fortified", width: "w-full", color: "bg-emerald-400" }
  }

  const copyToClipboard = (text, keyIdentifier, label) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(keyIdentifier)
    toast.success(`${label} copied to clipboard`, {
      theme: "dark",
      autoClose: 1800,
    })
    setTimeout(() => {
      setCopiedKey(prev => (prev === keyIdentifier ? null : prev))
    }, 1600)
  }

  const togglePasswordReveal = (id) => {
    setRevealedIds(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const savePassword = async () => {
    if (form.site.trim().length >= 3 && form.username.trim().length >= 3 && form.password.length >= 3) {
      const isEditing = Boolean(form.id)
      const passwordToSave = { ...form, id: form.id || uuidv4() }

      try {
        if (backendOnline) {
          const response = await fetch(
            isEditing ? `${API_BASE_URL}/${form.id}` : API_BASE_URL,
            {
              method: isEditing ? "PUT" : "POST",
              headers: authHeaders(),
              body: JSON.stringify(passwordToSave),
            }
          )
          if (!response.ok) throw new Error(`Backend status ${response.status}`)
        }

        setPasswordArray(previousPasswords =>
          isEditing
            ? previousPasswords.map(item =>
                item.id === passwordToSave.id ? passwordToSave : item
              )
            : [...previousPasswords, passwordToSave]
        )

        toast.success(isEditing ? 'Credential updated!' : 'Credential secured in vault!', {
          theme: "dark",
          transition: Bounce,
          autoClose: 2000,
        })
        setForm({ site: "", username: "", password: "" })
      } catch (error) {
        console.error("Error saving password:", error)
        toast.error("Could not sync with backend", { theme: "dark" })
      }
    } else {
      toast.warn('Please enter at least 3 characters for site, user, and password.', {
        theme: "dark",
        autoClose: 3000,
      })
    }
  }

  const DeletePassword = async (id) => {
    const confirmed = window.confirm("Are you sure you want to delete this credential from your vault?")
    if (confirmed) {
      try {
        if (backendOnline) {
          const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: "DELETE",
            headers: authHeaders(),
          })
          if (response.status === 401) onUnauthorized()
          if (!response.ok) throw new Error(`Backend status ${response.status}`)
        }

        setPasswordArray(previousPasswords =>
          previousPasswords.filter(item => item.id !== id)
        )
        toast.info('Credential removed from vault', {
          theme: "dark",
          transition: Bounce,
          autoClose: 2000,
        })
      } catch (error) {
        console.error("Error deleting password:", error)
        toast.error("Could not delete credential from backend", { theme: "dark" })
      }
    }
  }

  const EditPassword = (id) => {
    const passwordToEdit = passwordArray.find(item => item.id === id)
    if (passwordToEdit) {
      setForm({
        site: passwordToEdit.site,
        username: passwordToEdit.username,
        password: passwordToEdit.password,
        id: passwordToEdit.id,
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const cancelEditing = () => {
    setForm({ site: "", username: "", password: "" })
  }

  const filteredPasswords = passwordArray.filter(item =>
    (item.site || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.username || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const strength = getPasswordStrength(form.password)

  return (
    <div className="relative min-h-screen w-full bg-[#f4f1ec] pb-20 pt-10 text-[#1f2933] selection:bg-[#cce7ed] selection:text-[#14566d]">
      <ToastContainer position="top-right" autoClose={2000} theme="dark" />

      <main className="page-enter mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header / Hero Section */}
        <section className="hero-composition mb-8 border-b border-[#ddd8d0] pb-8">
          <div className="hero-copy">
          <div className="hero-eyebrow mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#176b87]">
            <span className="h-2 w-2 rounded-full bg-[#26968a]"></span>
            Personal password manager
          </div>
          <h1 className="hero-title font-['Space_Grotesk'] text-3xl font-bold tracking-tight text-[#1f2933] sm:text-5xl">
            Keep your digital life in order
          </h1>
          <p className="hero-support mt-3 max-w-xl text-sm leading-relaxed text-[#6f6a63] sm:text-base">
            Store your sign-ins in one calm, private place. Add a new account or find an existing one below.
          </p>
          </div>
          <div className="hero-lock" aria-hidden="true">
            <div className="hero-lock-ring hero-lock-ring-outer"></div>
            <div className="hero-lock-ring hero-lock-ring-inner"></div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 10V7a5 5 0 0110 0v3m-9 0h8a2 2 0 012 2v7a2 2 0 01-2 2H8a2 2 0 01-2-2v-7a2 2 0 012-2z" />
              <path strokeLinecap="round" d="M12 14v3" />
            </svg>
          </div>
        </section>

        {/* Input Panel Card */}
        <section className="vault-panel panel-reveal mb-12 rounded-lg border border-[#ddd8d0] bg-white p-6 shadow-[0_10px_35px_rgba(56,45,32,0.06)] sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#ebe7e1] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#e6f2ef] text-[#176b65]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-[#1f2933] sm:text-lg">
                {form.id ? "Edit account" : "Add an account"}
              </h2>
            </div>

            {form.id && (
              <button
                type="button"
                onClick={cancelEditing}
                className="rounded-md border border-[#d5d0c8] bg-white px-3 py-1.5 text-xs font-medium text-[#6f6a63] transition-all hover:bg-[#f4f1ec] hover:text-[#1f2933]"
              >
                Cancel Editing
              </button>
            )}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); void savePassword(); }} className="space-y-5">
            {/* Website URL Field */}
            <div>
              <label htmlFor={siteInputId} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#6f6a63]">
                Website or service
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </span>
                <input
                  id={siteInputId}
                  type="text"
                  name="site"
                  value={form.site}
                  onChange={handleChange}
                  placeholder="https://github.com or cloud.google.com"
                  className="w-full rounded-md border border-[#d5d0c8] bg-[#faf9f7] py-2.5 pl-10 pr-4 text-sm text-[#1f2933] placeholder:text-[#aaa39a] transition-all focus:border-[#176b87] focus:outline-none focus:ring-1 focus:ring-[#176b87]/30"
                  required
                />
              </div>
            </div>

            {/* Username & Password Grid */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Username Field */}
              <div>
                  <label htmlFor={usernameInputId} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#6f6a63]">
                    Username or email
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <input
                    id={usernameInputId}
                    type="text"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    placeholder="user@example.com or @admin"
                    className="w-full rounded-md border border-[#d5d0c8] bg-[#faf9f7] py-2.5 pl-10 pr-4 text-sm text-[#1f2933] placeholder:text-[#aaa39a] transition-all focus:border-[#176b87] focus:outline-none focus:ring-1 focus:ring-[#176b87]/30"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor={passwordInputId} className="text-xs font-semibold uppercase tracking-wider text-[#6f6a63]">
                    Password
                  </label>
                  {form.password && (
                    <span className="text-[11px] text-[#958e85]">
                      Strength: <span className="font-semibold text-[#176b65]">{strength.label}</span>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </span>
                  <input
                    id={passwordInputId}
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter or generate secret"
                    className="w-full rounded-md border border-[#d5d0c8] bg-[#faf9f7] py-2.5 pl-10 pr-20 text-sm text-[#1f2933] placeholder:text-[#aaa39a] transition-all focus:border-[#176b87] focus:outline-none focus:ring-1 focus:ring-[#176b87]/30"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-semibold text-[#7b746b] transition-colors hover:text-[#176b87]"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {/* Strength Meter Bar */}
                {form.password && (
                  <div className="mt-2 flex h-1 w-full overflow-hidden rounded-full bg-[#e8e4de]">
                    <div className={`h-full transition-all duration-300 ${strength.color} ${strength.width}`}></div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={generateStrongPassword}
                className="flex items-center gap-2 rounded-md border border-[#d5d0c8] bg-white px-4 py-2.5 text-xs font-semibold text-[#4b5563] transition-all hover:border-[#9ec8d2] hover:bg-[#f5fbfc] hover:text-[#176b87] active:scale-[0.98]"
              >
                <svg className="h-4 w-4 text-[#176b87]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <span>Generate password</span>
              </button>

              <button
                type="submit"
                className="flex items-center gap-2 rounded-md bg-[#176b87] px-6 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#145d74] active:scale-[0.98]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{form.id ? "Update account" : "Save account"}</span>
              </button>
            </div>
          </form>
        </section>

        {/* Stored Credentials Section */}
        <section className="credential-section section-reveal space-y-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-['Space_Grotesk'] text-xl font-bold tracking-tight text-[#1f2933] sm:text-2xl">
                Saved accounts
              </h2>
              <p className="mt-0.5 text-xs text-[#7b746b]">
                {passwordArray.length} {passwordArray.length === 1 ? "account" : "accounts"} saved
              </p>
            </div>

            {/* Search Input Filter */}
            {passwordArray.length > 0 && (
              <div className="relative w-full sm:w-72">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by site or username..."
                  className="w-full rounded-md border border-[#d5d0c8] bg-white py-2 pl-9 pr-4 text-xs text-[#1f2933] placeholder:text-[#aaa39a] transition-all focus:border-[#176b87] focus:outline-none focus:ring-1 focus:ring-[#176b87]/30"
                />
              </div>
            )}
          </div>

          {/* Credentials Display List / Table */}
          {passwordArray.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#d5d0c8] bg-white py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-[#e6f2ef] text-[#176b65]">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-[#36414b]">No accounts yet</h3>
              <p className="mt-1 max-w-sm text-xs text-[#7b746b]">
                Add your first account above and it will appear here.
              </p>
            </div>
          ) : filteredPasswords.length === 0 ? (
            <div className="rounded-lg border border-[#ddd8d0] bg-white py-10 text-center">
              <p className="text-sm text-[#6f6a63]">No accounts match &quot;{searchQuery}&quot;</p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-2 text-xs font-semibold text-[#176b87] hover:underline"
              >
                Clear filter
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-[#ddd8d0] bg-white shadow-[0_10px_35px_rgba(56,45,32,0.06)]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[#ebe7e1] bg-[#faf9f7] text-[11px] uppercase tracking-wider text-[#7b746b]">
                    <tr>
                      <th className="px-5 py-3.5 font-semibold">Website</th>
                      <th className="px-5 py-3.5 font-semibold">Username</th>
                      <th className="px-5 py-3.5 font-semibold">Password</th>
                      <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ebe7e1] text-xs">
                    {filteredPasswords.map((item) => {
                      const isRevealed = Boolean(revealedIds[item.id])
                      const isCopiedSite = copiedKey === `${item.id}-site`
                      const isCopiedUser = copiedKey === `${item.id}-user`
                      const isCopiedPass = copiedKey === `${item.id}-pass`

                      return (
                        <tr
                          key={item.id}
                          className="row-enter transition-colors hover:bg-[#faf9f7]"
                          style={{ animationDelay: `${filteredPasswords.indexOf(item) * 45}ms` }}
                        >
                          {/* Domain Column */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#e6f2ef] text-xs font-bold text-[#176b65]">
                                {(item.site.replace(/https?:\/\/(www\.)?/, '')[0] || 'V').toUpperCase()}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={item.site.startsWith('http') ? item.site : `https://${item.site}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="max-w-50 truncate font-medium text-[#2f5868] transition-colors hover:text-[#176b87] hover:underline"
                                >
                                  {item.site}
                                </a>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(item.site, `${item.id}-site`, "Website")}
                                  title="Copy URL"
                                  className="rounded p-1 text-[#aaa39a] transition-colors hover:bg-[#ebe7e1] hover:text-[#176b87]"
                                >
                                  {isCopiedSite ? (
                                    <span className="text-[10px] font-bold text-emerald-400">✓</span>
                                  ) : (
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Username Column */}
                          <td className="px-5 py-4 text-slate-300">
                            <div className="flex items-center gap-1.5 text-[#4b5563]">
                              <span className="max-w-45 truncate">{item.username}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(item.username, `${item.id}-user`, "Username")}
                                title="Copy username"
                                className="rounded p-1 text-[#aaa39a] transition-colors hover:bg-[#ebe7e1] hover:text-[#176b87]"
                              >
                                {isCopiedUser ? (
                                  <span className="text-[10px] font-bold text-emerald-400">✓</span>
                                ) : (
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Password Column */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#4b5563]">
                                {isRevealed ? item.password : "••••••••••••"}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordReveal(item.id)}
                                title={isRevealed ? "Hide password" : "Reveal password"}
                                className="rounded p-1 text-[#aaa39a] transition-colors hover:bg-[#ebe7e1] hover:text-[#176b87]"
                              >
                                {isRevealed ? (
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                  </svg>
                                ) : (
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(item.password, `${item.id}-pass`, "Password")}
                                title="Copy password"
                                className="rounded p-1 text-[#aaa39a] transition-colors hover:bg-[#ebe7e1] hover:text-[#176b87]"
                              >
                                {isCopiedPass ? (
                                  <span className="text-[10px] font-bold text-emerald-400">✓</span>
                                ) : (
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Operations Column */}
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => EditPassword(item.id)}
                                title="Edit credential"
                                className="rounded-md border border-[#d5d0c8] bg-white p-1.5 text-[#7b746b] transition-all hover:border-[#9ec8d2] hover:bg-[#f5fbfc] hover:text-[#176b87] active:scale-95"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => DeletePassword(item.id)}
                                title="Delete credential"
                                className="rounded-md border border-[#ead2ce] bg-[#fff8f6] p-1.5 text-[#b85c50] transition-all hover:border-[#d99d95] hover:bg-[#fff1ee] hover:text-[#963f35] active:scale-95"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default Manager
