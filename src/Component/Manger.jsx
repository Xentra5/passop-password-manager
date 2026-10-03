import { useState, useEffect, useId, useMemo } from 'react'
import { ToastContainer, toast, Bounce } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { v4 as uuidv4 } from "uuid";
import SiteLogo, { extractDomain, getFamousBrand, POPULAR_SERVICES } from './SiteLogo';
import { encryptCredential, decryptCredential } from '../utils/cryptoVault';
import VaultSecurityAudit from './VaultSecurityAudit';
import { checkPasswordBreach, auditVaultSecurity } from '../utils/breachCheck';
import PasswordGeneratorModal from './PasswordGeneratorModal';

const API_BASE_URL = "http://localhost:3000/api/passwords"

const Manager = ({ token, vaultKey, onUnauthorized, onPasswordRevealChange }) => {
  const [form, setForm] = useState({ site: "", username: "", password: "" })
  const [passwordArray, setPasswordArray] = useState([])
  const [showPassword, setShowPassword] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [copiedKey, setCopiedKey] = useState(null)
  const [revealedIds, setRevealedIds] = useState({})
  const [backendOnline, setBackendOnline] = useState(true)
  const [breachResults, setBreachResults] = useState(() => new Map())
  const [isScanningBreaches, setIsScanningBreaches] = useState(false)
  const [auditFilter, setAuditFilter] = useState('all')
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false)

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
    let isCancelled = false;
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
        const decryptedList = await Promise.all(
          passwords.map(async (item) => ({
            ...item,
            password: await decryptCredential(item.password, vaultKey),
          }))
        )
        if (!isCancelled) {
          setPasswordArray(decryptedList)
          setBackendOnline(true)
        }
      } catch (error) {
        console.warn('Backend unavailable, using local session state:', error)
        if (!isCancelled) {
          setBackendOnline(false)
        }
      }
    }

    void loadPasswords()
    return () => {
      isCancelled = true;
    }
  }, [token, vaultKey, onUnauthorized])

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

  const handleApplyGeneratedPassword = (newPassword) => {
    setForm(prev => ({ ...prev, password: newPassword }));
    setShowPassword(true);
    toast.success("Applied fortified secret to credential form!", {
      theme: "dark",
      transition: Bounce,
      autoClose: 2000,
    });
  };

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
      const generatedId = form.id || uuidv4()

      // Zero-Knowledge Client-Side Encryption:
      // The secret is encrypted inside the browser with AES-256-GCM before transmission.
      const encryptedPassword = await encryptCredential(form.password, vaultKey)
      const passwordToSave = {
        site: form.site.trim(),
        username: form.username.trim(),
        password: encryptedPassword,
        id: generatedId,
      }

      // Local state retains plaintext for instantaneous user display & copy
      const localPasswordRecord = {
        site: form.site.trim(),
        username: form.username.trim(),
        password: form.password,
        id: generatedId,
      }

      try {
        if (backendOnline) {
          const response = await fetch(
            isEditing ? `${API_BASE_URL}/${generatedId}` : API_BASE_URL,
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
                item.id === generatedId ? localPasswordRecord : item
              )
            : [...previousPasswords, localPasswordRecord]
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

  const auditData = useMemo(() => {
    return auditVaultSecurity(passwordArray, breachResults);
  }, [passwordArray, breachResults]);

  const handleScanBreaches = async () => {
    if (!passwordArray.length) {
      toast.info("No credentials in vault to scan.", { theme: "dark" });
      return;
    }
    setIsScanningBreaches(true);
    toast.info("Checking vault passwords with HaveIBeenPwned k-Anonymity...", {
      theme: "dark",
      autoClose: 2000,
    });

    try {
      const newMap = new Map(breachResults);
      const uniquePasswords = Array.from(new Set(passwordArray.map(p => p.password).filter(Boolean)));

      for (const pwd of uniquePasswords) {
        if (!newMap.has(pwd)) {
          const res = await checkPasswordBreach(pwd);
          newMap.set(pwd, res);
        }
      }

      setBreachResults(newMap);
      const updatedAudit = auditVaultSecurity(passwordArray, newMap);

      if (updatedAudit.breachedCount > 0) {
        toast.error(`Security Alert: ${updatedAudit.breachedCount} account(s) match known public data breaches!`, {
          theme: "dark",
          transition: Bounce,
          autoClose: 5000,
        });
      } else {
        toast.success("Zero compromised credentials found! Your vault is clean.", {
          theme: "dark",
          transition: Bounce,
          autoClose: 3000,
        });
      }
    } catch (err) {
      console.error("Breach scan error:", err);
      toast.error("Could not complete breach scan. Check network connection.", { theme: "dark" });
    } finally {
      setIsScanningBreaches(false);
    }
  };

  const filteredPasswords = passwordArray.filter(item => {
    // 1. Audit status filter
    if (auditFilter === 'breached' && !auditData.breachedIds.has(item.id)) return false;
    if (auditFilter === 'reused' && !auditData.reusedIds.has(item.id)) return false;
    if (auditFilter === 'weak' && !auditData.weakIds.has(item.id)) return false;

    // 2. Text search query
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const siteLower = (item.site || '').toLowerCase();
    const userLower = (item.username || '').toLowerCase();
    const domainLower = extractDomain(item.site).toLowerCase();
    const brand = getFamousBrand(item.site);
    const brandLower = brand ? brand.name.toLowerCase() : '';
    const categoryLower = brand && brand.category ? brand.category.toLowerCase() : '';

    return (
      siteLower.includes(q) ||
      userLower.includes(q) ||
      domainLower.includes(q) ||
      brandLower.includes(q) ||
      categoryLower.includes(q)
    );
  });

  const strength = getPasswordStrength(form.password)
  const isAnyRevealed = Boolean(showPassword || Object.values(revealedIds).some(Boolean))

  useEffect(() => {
    if (onPasswordRevealChange) {
      onPasswordRevealChange(isAnyRevealed)
    }
  }, [isAnyRevealed, onPasswordRevealChange])

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
          <div
            className={`hero-lock group cursor-pointer transition-all duration-300 ${
              isAnyRevealed ? "unlocked" : "locked"
            }`}
            onClick={() => setShowPassword(prev => !prev)}
            title={
              isAnyRevealed
                ? "Password visible • Click to lock vault"
                : "Vault locked • Click to unlock & show password"
            }
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                setShowPassword(prev => !prev)
              }
            }}
            aria-label={isAnyRevealed ? "Lock vault" : "Unlock vault"}
          >
            <div className={`hero-lock-ring hero-lock-ring-outer ${isAnyRevealed ? "ring-unlocked-outer" : ""}`}></div>
            <div className={`hero-lock-ring hero-lock-ring-inner ${isAnyRevealed ? "ring-unlocked-inner" : ""}`}></div>
            
            <div className="relative z-10 flex flex-col items-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className={`transition-all duration-300 drop-shadow-md ${
                  isAnyRevealed
                    ? "text-emerald-600 scale-105"
                    : "text-[#176b87]"
                }`}
              >
                {isAnyRevealed ? (
                  /* Open Padlock with shackle unhooked and swung open */
                  <g className="transition-all duration-300">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 11V7a5 5 0 019.9-1.2"
                      strokeWidth="2.2"
                      className="stroke-emerald-600 animate-[pulse_2s_infinite]"
                    />
                    <rect
                      x="4.5"
                      y="11"
                      width="15"
                      height="10"
                      rx="2.5"
                      fill="currentColor"
                      fillOpacity="0.12"
                      className="stroke-emerald-600"
                      strokeWidth="1.8"
                    />
                    <circle cx="12" cy="15.5" r="1.2" fill="currentColor" className="text-emerald-500" />
                    <path strokeLinecap="round" d="M12 16.7v2" strokeWidth="2" className="stroke-emerald-600" />
                  </g>
                ) : (
                  /* Closed Padlock securely locked */
                  <g className="transition-all duration-300">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7.5 11V7a4.5 4.5 0 019 0v4"
                      strokeWidth="2"
                    />
                    <rect
                      x="4.5"
                      y="11"
                      width="15"
                      height="10"
                      rx="2.5"
                      fill="currentColor"
                      fillOpacity="0.08"
                      strokeWidth="1.8"
                    />
                    <circle cx="12" cy="15.5" r="1.2" fill="currentColor" />
                    <path strokeLinecap="round" d="M12 16.7v2" strokeWidth="2" />
                  </g>
                )}
              </svg>

              <span
                className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                  isAnyRevealed
                    ? "border border-emerald-400 bg-emerald-50 text-emerald-800 shadow-sm"
                    : "border border-[#176b87]/30 bg-[#e6f2ef] text-[#176b87]"
                }`}
              >
                {isAnyRevealed ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>Unlocked</span>
                  </>
                ) : (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#176b87]"></span>
                    <span>Secured</span>
                  </>
                )}
              </span>
            </div>
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
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  {form.site.trim() ? (
                    <SiteLogo site={form.site} size="sm" />
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  )}
                </span>
                <input
                  id={siteInputId}
                  type="text"
                  name="site"
                  value={form.site}
                  onChange={handleChange}
                  placeholder="https://youtube.com, github.com, or google.com"
                  className="w-full rounded-md border border-[#d5d0c8] bg-[#faf9f7] py-2.5 pl-11 pr-4 text-sm text-[#1f2933] placeholder:text-[#aaa39a] transition-all focus:border-[#176b87] focus:outline-none focus:ring-1 focus:ring-[#176b87]/30"
                  required
                />
              </div>

              {/* Quick Brand Autofill Chips */}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-[#8c857b] mr-0.5">Quick fill:</span>
                {POPULAR_SERVICES.slice(0, 10).map((srv) => (
                  <button
                    key={srv.domain}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, site: srv.defaultUrl }))}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all ${
                      extractDomain(form.site) === srv.domain
                        ? 'bg-[#176b87] text-white border-[#176b87] shadow-xs'
                        : 'bg-white text-[#4b5563] border-[#d5d0c8] hover:border-[#176b87] hover:bg-[#f5fbfc]'
                    }`}
                  >
                    <SiteLogo site={srv.domain} size="xs" />
                    <span>{srv.name}</span>
                  </button>
                ))}
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
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 transition-colors">
                    {showPassword ? (
                      /* Open lock icon when password is shown */
                      <svg className="h-4 w-4 text-emerald-600 transition-colors animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 017.6-1.8M5 11h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2z" />
                      </svg>
                    ) : (
                      /* Key icon when locked */
                      <svg className="h-4 w-4 text-slate-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    )}
                  </span>
                  <input
                    id={passwordInputId}
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter or generate secret"
                    className={`w-full rounded-md border bg-[#faf9f7] py-2.5 pl-10 pr-24 text-sm text-[#1f2933] placeholder:text-[#aaa39a] transition-all focus:outline-none focus:ring-1 ${
                      showPassword
                        ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/30"
                        : "border-[#d5d0c8] focus:border-[#176b87] focus:ring-[#176b87]/30"
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className={`absolute inset-y-1 right-1 my-auto flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-semibold transition-all ${
                      showPassword
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300"
                        : "text-[#7b746b] hover:bg-[#ebe7e1] hover:text-[#176b87]"
                    }`}
                    title={showPassword ? "Lock and hide password" : "Open lock and show password"}
                  >
                    {showPassword ? (
                      <>
                        <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 017.6-1.8M5 11h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2z" />
                        </svg>
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5 text-[#7b746b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>Show</span>
                      </>
                    )}
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
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsGeneratorOpen(true)}
                  className="flex items-center gap-2 rounded-md border border-[#176b87]/40 bg-[#f0f8fa] px-3.5 py-2.5 text-xs font-semibold text-[#176b87] transition-all hover:bg-[#176b87] hover:text-white active:scale-[0.98]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  <span>Customize & Generate</span>
                </button>

                <button
                  type="button"
                  onClick={generateStrongPassword}
                  title="Generate 16-character password immediately"
                  className="flex items-center gap-1.5 rounded-md border border-[#d5d0c8] bg-white px-3 py-2.5 text-xs font-medium text-[#4b5563] transition-all hover:bg-[#f4f1ec] active:scale-[0.98]"
                >
                  <span>⚡ Quick 16-char</span>
                </button>
              </div>

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

        {/* Vault Security Audit & HaveIBeenPwned Breach Scanner */}
        <VaultSecurityAudit
          auditData={auditData}
          onScanBreaches={handleScanBreaches}
          isScanning={isScanningBreaches}
          activeFilter={auditFilter}
          onSelectFilter={setAuditFilter}
          onFixPassword={EditPassword}
        />

        {/* Stored Credentials Section */}
        <section className="credential-section section-reveal space-y-4">
          {/* Active Audit Filter Notice */}
          {auditFilter !== 'all' && (
            <div className="flex items-center justify-between rounded-lg border border-[#176b87]/30 bg-[#f0f8fa] px-4 py-2.5 text-xs text-[#176b87]">
              <div className="flex items-center gap-2">
                <span className="rounded bg-[#176b87] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Filter Active
                </span>
                <span>
                  Displaying only <strong>{auditFilter}</strong> credentials ({filteredPasswords.length} items)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAuditFilter('all')}
                className="font-bold underline hover:text-[#145d74]"
              >
                Show All Accounts ✕
              </button>
            </div>
          )}

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
                            <div className="flex items-center gap-3">
                              <SiteLogo site={item.site} size="md" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {(() => {
                                    const brand = getFamousBrand(item.site);
                                    const domain = extractDomain(item.site);
                                    return (
                                      <>
                                        {brand ? (
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-[#1f2933] text-xs">
                                              {brand.name}
                                            </span>
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                              Official
                                            </span>
                                            {brand.category && (
                                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                {brand.category}
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="font-semibold text-[#1f2933] text-xs">
                                            {domain || item.site}
                                          </span>
                                        )}
                                      </>
                                    );
                                  })()}
                                  {/* Security Status Badges */}
                                  {auditData.breachedIds.has(item.id) && (
                                    <span
                                      className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200"
                                      title="Alert: This password has leaked in public data breaches!"
                                    >
                                      🚨 Leaked
                                    </span>
                                  )}
                                  {auditData.reusedIds.has(item.id) && (
                                    <span
                                      className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200"
                                      title="Notice: Password is used on multiple accounts"
                                    >
                                      🔁 Reused
                                    </span>
                                  )}
                                  {auditData.weakIds.has(item.id) && (
                                    <span
                                      className="inline-flex items-center gap-1 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-800 border border-orange-200"
                                      title="Notice: Password length is under 10 or lacks character diversity"
                                    >
                                      ⚠️ Weak
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <a
                                    href={item.site.startsWith('http') ? item.site : `https://${item.site}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    title={item.site}
                                    className="max-w-60 truncate text-[11px] text-[#7b746b] hover:text-[#176b87] hover:underline"
                                  >
                                    {item.site}
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(item.site, `${item.id}-site`, "Website")}
                                    title="Copy URL"
                                    className="rounded p-0.5 text-[#aaa39a] transition-colors hover:bg-[#ebe7e1] hover:text-[#176b87]"
                                  >
                                    {isCopiedSite ? (
                                      <span className="text-[10px] font-bold text-emerald-500">✓</span>
                                    ) : (
                                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                    )}
                                  </button>
                                </div>
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
                              {/* Plaintext or masked password display */}
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-xs font-mono transition-all ${
                                    isRevealed
                                      ? "font-semibold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                                      : "text-[#4b5563] tracking-widest"
                                  }`}
                                >
                                  {isRevealed ? item.password : "••••••••••••"}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => togglePasswordReveal(item.id)}
                                title={isRevealed ? "Hide password" : "Reveal password"}
                                className={`rounded p-1.5 transition-all ${
                                  isRevealed
                                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-300"
                                    : "text-[#aaa39a] hover:bg-[#ebe7e1] hover:text-[#176b87]"
                                }`}
                              >
                                {isRevealed ? (
                                  /* Eye-slash icon when revealed */
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                  </svg>
                                ) : (
                                  /* Eye icon when hidden */
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

        {/* Cryptographic Password & Passphrase Generator Modal */}
        <PasswordGeneratorModal
          isOpen={isGeneratorOpen}
          onClose={() => setIsGeneratorOpen(false)}
          onApplyPassword={handleApplyGeneratedPassword}
        />
      </main>
    </div>
  )
}

export default Manager
