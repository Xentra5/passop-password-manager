import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LandingPage from "./Component/LandingPage";
import Auth from "./Component/Auth";
import PasswordHistoryModal from "./Component/PasswordHistoryModal";
import LockScreenModal from "./Component/LockScreenModal";
import { encryptCredential, decryptCredential, encryptCustomFields, decryptCustomFields, clearCachedVaultKey } from "./utils/cryptoVault";
import { secureFetch, setCsrfToken } from "./utils/csrf";
import { getAutoLockTimeoutMinutes, setAutoLockTimeoutMinutes } from "./utils/pinAuth";

const CATEGORIES = ["Personal", "Finance", "Work", "Developer"];
const initialForm = { service: "", category: "Personal", username: "", password: "", note: "" };
const POPULAR_SERVICES = ["Netflix", "Stripe", "Notion", "YouTube", "Google", "GitHub", "Amazon", "Facebook", "Instagram", "Microsoft"];
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/passwords";
const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL ?? "http://localhost:3000/api/auth";

function passwordStrength(value) {
  if (!value) return "";
  if (value.length < 10 || !/[A-Z]/.test(value) || !/[0-9]/.test(value)) return "Weak";
  return "Strong";
}

function AuthOverlay({ open, mode, onClose, onAuthenticated }) {
  if (!open) return null;
  return <div className="auth-overlay"><div className="auth-overlay-card"><Auth initialMode={mode} onClose={onClose} onAuthenticated={onAuthenticated} /></div></div>;
}

function App() {
  const [credentials, setCredentials] = useState([]);
  const [session, setSession] = useState({ user: null, token: null });
  const [vaultKey, setVaultKey] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [vaultError, setVaultError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [weakOnly, setWeakOnly] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerClosing, setDrawerClosing] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [currentPasswordConfirmation, setCurrentPasswordConfirmation] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [credentialFormError, setCredentialFormError] = useState("");
  const [revealed, setRevealed] = useState({});
  const [copied, setCopied] = useState("");
  const [showLanding, setShowLanding] = useState(true);
  const [isVaultLocked, setIsVaultLocked] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [selectedHistoryAccount, setSelectedHistoryAccount] = useState(null);
  const [autoLockMinutes, setAutoLockMinutes] = useState(() => getAutoLockTimeoutMinutes());
  // BUG #2 FIX: Track whether we are still checking the session cookie on mount.
  // This prevents the landing page from flashing before the /me check completes.
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const clipboardTimerRef = useRef(null);
  const searchRef = useRef(null);

  const filtered = useMemo(() => credentials.filter((item) => {
    const matchesCategory = category === "All" || item.category === category;
    const term = query.trim().toLowerCase();
    return matchesCategory && (!weakOnly || passwordStrength(item.password) === "Weak") && (!term || `${item.service} ${item.username} ${item.category}`.toLowerCase().includes(term));
  }), [credentials, category, query, weakOnly]);

  const searchSuggestions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];

    return credentials
      .filter((item) => {
        const service = (item.service || "").toLowerCase();
        const username = (item.username || "").toLowerCase();
        const itemCategory = (item.category || "").toLowerCase();
        return service.includes(term) || username.includes(term) || itemCategory.includes(term);
      })
      .slice(0, 6);
  }, [credentials, query]);

  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [serviceSuggestionIndex, setServiceSuggestionIndex] = useState(0);
  const [serviceSuggestionsDismissed, setServiceSuggestionsDismissed] = useState(false);

  function handleSearchKeyDown(event) {
    if (!searchSuggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion((index) => (index + 1) % searchSuggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion((index) => (index - 1 + searchSuggestions.length) % searchSuggestions.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const suggestion = searchSuggestions[activeSuggestion];
      if (suggestion) setQuery(suggestion.service || suggestion.username);
    } else if (event.key === "Escape") {
      setQuery("");
      setActiveSuggestion(0);
    }
  }

  const weakCount = credentials.filter((item) => passwordStrength(item.password) === "Weak").length;
  const strongCount = credentials.filter((item) => passwordStrength(item.password) === "Strong").length;
  const editingCredential = credentials.find((item) => item.id === editingId);
  const isChangingPassword = Boolean(editingCredential && editingCredential.password !== form.password);
  const passwordGroups = useMemo(() => {
    const groups = new Map();
    credentials.forEach((item) => {
      if (item.password) groups.set(item.password, (groups.get(item.password) || 0) + 1);
    });
    return groups;
  }, [credentials]);
  const reusedCount = credentials.filter((item) => item.password && passwordGroups.get(item.password) > 1).length;
  const healthScore = credentials.length
    ? Math.max(0, Math.round(100 - (weakCount / credentials.length) * 45 - (reusedCount / credentials.length) * 35))
    : 100;

  function authHeaders(json = false) {
    return {
      ...(json ? { "Content-Type": "application/json" } : {}),
      ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}),
    };
  }

  function openAuth(mode = "login") {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }

  function handleAuthenticated(data) {
    setSession({ user: data.user, token: data.token || null });
    setVaultKey(data.vaultKey);
    setAuthModalOpen(false);
    setShowLanding(false);
    setVaultError("");
    setIsVaultLocked(false);
    setIsRestoringSession(false);
    localStorage.setItem("passvault_user", JSON.stringify(data.user));
  }

  async function handleLogout() {
    try { await secureFetch(`${AUTH_API_URL}/logout`, { method: "POST", headers: authHeaders() }); } catch { /* Local lock still completes if the server is offline. */ }
    localStorage.removeItem("passvault_user");
    clearCachedVaultKey();
    setSession({ user: null, token: null });
    setVaultKey(null);
    setCredentials([]);
    setShowLanding(true);
    setVaultError("");
    setIsVaultLocked(false);
  }

  // BUG #2 FIX: On every page load/refresh, silently try GET /api/auth/me.
  // If the HttpOnly cookie is still valid, restore the user session without
  // forcing them back to the landing page. The vault key is NOT restored
  // (it only lives in RAM) — so we show the LockScreenModal for re-entry.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`${AUTH_API_URL}/me`, {
          method: "GET",
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          if (!cancelled && data?.user) {
            // Restore CSRF token from the /me response
            if (data.csrfToken) setCsrfToken(data.csrfToken);
            // Session cookie is valid — restore user identity but vault key is gone (page refresh).
            // Show vault locked screen so user re-enters master password.
            setSession({ user: data.user, token: null });
            setShowLanding(false);
            setIsVaultLocked(true);
          }
        }
        // If the /me call fails (401) — no valid cookie — show the landing page as normal.
      } catch {
        // Network error or backend offline — stay on landing page.
      } finally {
        if (!cancelled) setIsRestoringSession(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run ONCE on mount only

  const lockVault = useCallback(() => {
    if (!session.user) return;
    // Keep the in-memory key and decrypted records available for the
    // configured quick PIN. A PIN is only a local gate; it cannot recreate
    // a key that has already been discarded. A page refresh still clears
    // the key and correctly requires the master password.
    setRevealed({});
    setQuery("");
    setHealthOpen(false);
    setIsVaultLocked(true);
  }, [session.user]);

  // Called by LockScreenModal when user re-enters their master password after
  // a page refresh. Validate the derived key against stored ciphertext before
  // unlocking; PBKDF2 can derive a key from any input, including a wrong one.
  const handleUnlockWithMasterPassword = useCallback(async (masterPassword) => {
    const { deriveVaultKey } = await import("./utils/cryptoVault");
    const key = await deriveVaultKey(masterPassword, session.user.email);
    let response;
    try {
      response = await secureFetch(API_BASE_URL, {
        headers: authHeaders(),
        signal: AbortSignal.timeout(15000),
      });
    } catch (error) {
      if (error.name === "TimeoutError" || error.name === "AbortError") {
        throw new Error("The vault API did not respond within 15 seconds. Check that the backend is running, then try again.", { cause: error });
      }
      throw new Error("Could not connect to the vault API. Check that the backend is running.", { cause: error });
    }
    if (!response.ok) {
      let detail = "";
      try {
        const body = await response.json();
        detail = typeof body?.message === "string" ? body.message : "";
      } catch {
        // Keep the status based message when the server did not return JSON.
      }
      if (response.status === 401) {
        throw new Error("Your session expired. Log out and sign in again.");
      }
      throw new Error(detail || `Could not verify your vault (API ${response.status}).`);
    }
    const items = await response.json();
    if (!Array.isArray(items)) {
      throw new Error("The vault API returned an unexpected response. Check the backend and try again.");
    }
    const encryptedItem = items.find((item) => typeof item.password === "string" && item.password.startsWith("enc:v2:"));
    if (encryptedItem) {
      const decryptedPassword = await decryptCredential(encryptedItem.password, key);
      if (decryptedPassword === "[Decryption Failed]") {
        throw new Error("Incorrect master password.");
      }
    }
    setVaultKey(key);
    setIsVaultLocked(false);
  }, [session.user, session.token]);

  // Called by LockScreenModal when user unlocks with PIN (vault key already in RAM).
  const handlePinUnlock = useCallback(() => {
    setIsVaultLocked(false);
  }, []);

  function updateAutoLockMinutes(value) {
    const minutes = Number(value);
    setAutoLockMinutes(minutes);
    setAutoLockTimeoutMinutes(minutes);
  }

  useEffect(() => {
    if (!session.user || !vaultKey || isVaultLocked || autoLockMinutes <= 0) return undefined;
    let timer;
    const resetTimer = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(lockVault, autoLockMinutes * 60 * 1000);
    };
    const events = ["pointerdown", "keydown", "mousemove", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      window.clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [session.user, vaultKey, isVaultLocked, autoLockMinutes, lockVault]);

  useEffect(() => {
    if (!session.user || !vaultKey) return undefined;
    let cancelled = false;
    setIsLoading(true);
    setVaultError("");
    secureFetch(API_BASE_URL, { headers: authHeaders() })
      .then(async (response) => {
        if (response.status === 401) throw new Error("Your session expired. Please sign in again.");
        if (!response.ok) throw new Error(`Could not load your vault (${response.status}).`);
        return response.json();
      })
      .then(async (items) => Promise.all(items.map(async (item) => {
        const password = await decryptCredential(item.password, vaultKey);
        const history = Array.isArray(item.history)
          ? await Promise.all(item.history.map(async (entry) => ({
            password: await decryptCredential(entry.password, vaultKey),
            changedAt: entry.changedAt,
          })))
          : [];
        const customFields = Array.isArray(item.customFields) ? await decryptCustomFields(item.customFields, vaultKey) : [];
        const note = customFields.find((field) => field.label === "Note")?.value || "";
        // Older records may omit `site`, username, or password. Normalize them
        // before rendering so one incomplete record cannot crash the list.
        const service = typeof item.site === "string" && item.site.trim()
          ? item.site.trim()
          : typeof item.service === "string" && item.service.trim()
            ? item.service.trim()
            : "Untitled account";
        return {
          ...item,
          service,
          username: typeof item.username === "string" ? item.username : "",
          password: typeof password === "string" ? password : "",
          history,
          category: item.tag === "Development" ? "Developer" : (item.tag || "Personal"),
          note,
          customFields,
        };
      })))
      .then((items) => { if (!cancelled) setCredentials(items); })
      .catch((error) => { if (!cancelled) setVaultError(error.message); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [session.user, session.token, vaultKey]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") closeDrawer();
      if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
        event.preventDefault(); searchRef.current?.focus();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); searchRef.current?.focus();
      }
      if (!showLanding && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "a" && !drawerOpen) openNewCredential();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function openNewCredential() {
    setForm(initialForm); setEditingId(null); setCurrentPasswordConfirmation(""); setNewPasswordConfirmation(""); setCredentialFormError(""); setServiceSuggestionIndex(0); setServiceSuggestionsDismissed(false); setDrawerClosing(false); setDrawerOpen(true);
  }

  function openEdit(item) {
    setForm({ service: item.service, category: item.category, username: item.username, password: item.password, note: item.note || "" });
    setEditingId(item.id); setCurrentPasswordConfirmation(""); setNewPasswordConfirmation(""); setCredentialFormError(""); setServiceSuggestionsDismissed(true); setDrawerClosing(false); setDrawerOpen(true);
  }

  function closeDrawer() {
    if (!drawerOpen || drawerClosing) return;
    setDrawerClosing(true);
    window.setTimeout(() => {
      setDrawerOpen(false);
      setDrawerClosing(false);
    }, 380);
  }

  const serviceSuggestions = useMemo(() => {
    const term = form.service.trim().toLowerCase();
    if (!term || serviceSuggestionsDismissed) return [];

    const savedServices = credentials.map((item) => item.service).filter(Boolean);
    return [...new Set([...savedServices, ...POPULAR_SERVICES])]
      .filter((service) => service.toLowerCase().includes(term))
      .slice(0, 6);
  }, [credentials, form.service, serviceSuggestionsDismissed]);

  function handleServiceKeyDown(event) {
    if (!serviceSuggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setServiceSuggestionIndex((index) => (index + 1) % serviceSuggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setServiceSuggestionIndex((index) => (index - 1 + serviceSuggestions.length) % serviceSuggestions.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      setForm((value) => ({ ...value, service: serviceSuggestions[serviceSuggestionIndex] }));
      setServiceSuggestionsDismissed(true);
    } else if (event.key === "Escape") {
      setServiceSuggestionIndex(0);
    }
  }

  async function saveCredential(event) {
    event.preventDefault();
    if (!session.user || !vaultKey) {
      setVaultError("Sign in to save credentials to your account.");
      closeDrawer();
      setShowLanding(true);
      return;
    }
    const existing = credentials.find((item) => item.id === editingId);
    const passwordChanged = Boolean(existing && existing.password !== form.password);
    if (passwordChanged && currentPasswordConfirmation !== existing.password) {
      setCredentialFormError("Enter the account's current password to change it.");
      return;
    }
    if (passwordChanged && newPasswordConfirmation !== form.password) {
      setCredentialFormError("Confirm the new password before saving.");
      return;
    }
    setCredentialFormError("");
    const id = editingId || crypto.randomUUID();
    const customFields = form.note.trim()
      ? await encryptCustomFields([{ id: "note", label: "Note", value: form.note.trim(), type: "text" }], vaultKey)
      : [];
    const payload = {
      id,
      site: form.service.trim(),
      username: form.username.trim(),
      password: await encryptCredential(form.password, vaultKey),
      favorite: Boolean(existing?.favorite),
      tag: form.category === "Developer" ? "Development" : form.category,
      customFields,
      history: passwordChanged
        ? await Promise.all([
          { password: existing.password, changedAt: new Date().toISOString() },
          ...(existing.history || []),
        ].slice(0, 50).map(async (entry) => ({
          password: await encryptCredential(entry.password, vaultKey),
          changedAt: entry.changedAt,
        })))
        : (existing?.history
          ? await Promise.all(existing.history.map(async (entry) => ({
            password: await encryptCredential(entry.password, vaultKey),
            changedAt: entry.changedAt,
          })))
          : []),
    };
    const history = passwordChanged
      ? [{ password: existing.password, changedAt: new Date().toISOString() }, ...(existing.history || [])].slice(0, 50)
      : (existing?.history || []);
    setIsSaving(true);
    setVaultError("");
    try {
      const response = await secureFetch(editingId ? `${API_BASE_URL}/${encodeURIComponent(id)}` : API_BASE_URL, {
        method: editingId ? "PUT" : "POST",
        headers: authHeaders(true),
        body: JSON.stringify(payload),
      });
      if (response.status === 401) throw new Error("Your session expired. Please sign in again.");
      if (!response.ok) throw new Error("The database could not save this credential.");
      setCredentials((items) => editingId
        ? items.map((item) => item.id === id ? { ...item, ...form, site: payload.site, tag: payload.tag, history } : item)
        : [...items, { ...form, id, site: payload.site, tag: payload.tag, favorite: false, history: [] }]);
      setCurrentPasswordConfirmation("");
      setNewPasswordConfirmation("");
      closeDrawer();
      setForm(initialForm);
    } catch (error) {
      setVaultError(error.message);
    } finally {
      setIsSaving(false);
    }

  }

  function openHistory(item) {
    setSelectedHistoryAccount({ ...item, site: item.service });
  }

  function restoreHistoricalPassword(accountId, historicalPassword) {
    const account = credentials.find((item) => item.id === accountId);
    if (!account) return;
    openEdit(account);
    setForm((value) => ({ ...value, password: historicalPassword }));
    setSelectedHistoryAccount(null);
    setCredentialFormError("");
  }

  async function clearPasswordHistory(accountId) {
    const account = credentials.find((item) => item.id === accountId);
    if (!account) return;
    setVaultError("");
    try {
      const response = await secureFetch(`${API_BASE_URL}/${encodeURIComponent(accountId)}`, {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify({
          id: account.id,
          site: account.service,
          username: account.username,
          password: await encryptCredential(account.password, vaultKey),
          favorite: Boolean(account.favorite),
          tag: account.category === "Developer" ? "Development" : account.category,
          customFields: await encryptCustomFields(account.customFields || [], vaultKey),
          history: [],
        }),
      });
      if (!response.ok) throw new Error("The database could not clear this password history.");
      const updated = { ...account, history: [] };
      setCredentials((items) => items.map((item) => item.id === accountId ? updated : item));
      setSelectedHistoryAccount(updated);
    } catch (error) {
      setVaultError(error.message);
    }
  }

  function generatePassword() {
    const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
    const bytes = crypto.getRandomValues(new Uint8Array(18));
    setForm((value) => ({ ...value, password: Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("") }));
    setCurrentPasswordConfirmation("");
    setNewPasswordConfirmation("");
    setCredentialFormError("");
  }

  async function copyValue(value, id) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      window.clearTimeout(clipboardTimerRef.current);
      clipboardTimerRef.current = window.setTimeout(async () => {
        try {
          if (!navigator.clipboard.readText || (await navigator.clipboard.readText()) === value) {
            await navigator.clipboard.writeText("");
          }
        } catch {
          // Clipboard permissions may prevent clearing.
        }
        setCopied("");
      }, 30000);
    } catch {
      setVaultError("Clipboard access was blocked by your browser.");
    }
  }

  async function removeCredential(id) {
    setVaultError("");
    try {
      const response = await secureFetch(`${API_BASE_URL}/${encodeURIComponent(id)}`, { method: "DELETE", headers: authHeaders() });
      if (!response.ok) throw new Error("The database could not delete this credential.");
      setCredentials((items) => items.filter((item) => item.id !== id));
    } catch (error) {
      setVaultError(error.message);
    }
  }

  // BUG #2 FIX: While checking the session cookie on mount, show a minimal loading
  // indicator to prevent the landing page from incorrectly flashing for logged-in users.
  if (isRestoringSession) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0b0f17", color: "#a0aec0", fontFamily: "system-ui, sans-serif", fontSize: "1rem", letterSpacing: "0.05em" }}>
        <span style={{ opacity: 0.7 }}>Restoring session…</span>
      </div>
    );
  }

  if (showLanding) {
    return <><div className="landing-page-view dark min-h-screen bg-[#0b0f17] text-white">
      <header className="landing-return-header"><a href="#home">PassVault <small>personal vault</small></a><button type="button" onClick={() => openAuth("login")}>Sign in</button></header>
      <LandingPage onOpenAuth={openAuth} />
    </div><AuthOverlay open={authModalOpen} mode={authModalMode} onClose={() => setAuthModalOpen(false)} onAuthenticated={handleAuthenticated} /></>;
  }

  return (
    <div className="replica-app">
      <header className="replica-header">
        <div className="replica-header-inner">
          <a className="replica-brand" href="#vault" aria-label="PassVault home"><span>PassVault</span><small>personal vault</small></a>
          <div className="replica-header-actions">
            <button className="landing-toggle" onClick={() => setShowLanding(true)}>Landing page</button>
            <button className="add-credential-button" onClick={openNewCredential}>Add credential <kbd>A</kbd></button>
            <button className="lock-vault-button" onClick={lockVault} title="Lock vault now">Lock</button>
            <span className="profile-button" aria-label="Signed-in account"><span className="profile-dot">●</span>{session.user?.name || session.user?.email}</span>
            <button className="logout-button" onClick={handleLogout}>Log out</button>
          </div>
        </div>
      </header>

      <main id="vault" className="replica-main">
        <section className="replica-intro">
          <h1>Your saved accounts</h1>
          <p>Personal credentials and login records kept safely on this device.</p>
        </section>

        <section className="vault-summary" aria-label="Vault password summary">
          <div className="summary-counts"><span>{strongCount} strong</span><b>•</b><span className="weak-count">{weakCount} weak</span><b>•</b><span className="breached-count">0 breached</span></div>
          <div className="summary-actions">
            <button className="summary-review" onClick={() => setHealthOpen((value) => !value)}>Security score {healthScore}% <span aria-hidden="true">›</span></button>
            <button className="summary-review" disabled={!weakCount} onClick={() => setWeakOnly((value) => !value)}>{weakOnly ? "Show all passwords" : weakCount ? `Review ${weakCount} vulnerable password${weakCount === 1 ? "" : "s"}` : "All passwords look good"}<span aria-hidden="true">›</span></button>
          </div>
        </section>
        {healthOpen && (
          <section className="health-dashboard" aria-label="Password health dashboard">
            <div><strong>{healthScore}%</strong><span>Overall health</span></div>
            <div><strong>{weakCount}</strong><span>Weak passwords</span></div>
            <div><strong>{reusedCount}</strong><span>Reused passwords</span></div>
            <label>Auto-lock
              <select value={autoLockMinutes} onChange={(event) => updateAutoLockMinutes(event.target.value)}>
                <option value="0">Off</option>
                <option value="1">1 minute</option>
                <option value="5">5 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
              </select>
            </label>
          </section>
        )}

        <div className="list-toolbar">
          <div className="quick-search">
            <label className="search-box"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg><input ref={searchRef} value={query} onChange={(event) => { setQuery(event.target.value); setActiveSuggestion(0); }} onKeyDown={handleSearchKeyDown} placeholder="Search by name, username or service..." aria-label="Search credentials" aria-autocomplete="list" aria-controls="quick-search-suggestions" aria-expanded={searchSuggestions.length > 0} /><kbd>/</kbd></label>
            {searchSuggestions.length > 0 && (
              <div id="quick-search-suggestions" className="quick-search-suggestions" role="listbox">
                {searchSuggestions.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={index === activeSuggestion}
                    className={index === activeSuggestion ? "active" : ""}
                    onMouseEnter={() => setActiveSuggestion(index)}
                    onClick={() => { setQuery(item.service || item.username); searchRef.current?.focus(); }}
                  >
                    <span className="suggestion-icon">{(item.service || "?").charAt(0).toUpperCase()}</span>
                    <span className="suggestion-copy"><strong>{item.service || "Untitled account"}</strong><small>{item.username || "No username"}</small></span>
                    <span className="suggestion-status">Saved</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <nav className="category-tabs" aria-label="Filter by category">
            {["All", "Finance", "Work", "Personal"].map((value) => <button key={value} className={category === value && !weakOnly ? "active" : ""} onClick={() => { setCategory(value); setWeakOnly(false); }}>{value}{value === "All" && <span>({credentials.length})</span>}</button>)}
          </nav>
        </div>

        <section className="credential-list" aria-label="Saved credentials">
          <div className="credential-list-head"><span>Service &amp; name</span><span>Username or email</span><span>Password</span><span>Status</span><span>Actions</span></div>
          {vaultError && <div className="vault-message" role="alert">{vaultError}{vaultError.includes("session expired") && <button onClick={() => { void handleLogout(); }}>Sign in again</button>}</div>}
          {isLoading && <div className="empty-list">Loading credentials from your account…</div>}
          {!isLoading && filtered.length === 0 ? <div className="empty-list">{credentials.length ? "No credentials match your search." : "No credentials saved yet. Select Add credential to get started."}</div> : !isLoading && filtered.map((item) => {
            const strength = passwordStrength(item.password);
            return <article className="credential-row" key={item.id}>
              <div className="service-cell"><span className={`service-icon tone-${(item.service.charCodeAt(0) || 0) % 5}`}>{item.service.trim().charAt(0).toUpperCase() || "•"}</span><div><strong>{item.service}</strong><small>{item.category} · {item.service.toLowerCase().replace(/\s+/g, "")}</small></div></div>
              <div className="username-cell"><span>{item.username}</span><button className="icon-action inline-copy" aria-label="Copy username" onClick={() => copyValue(item.username, `${item.id}-user`)}>{copied === `${item.id}-user` ? "✓" : "▢"}</button></div>
              <div className="password-cell"><span>{revealed[item.id] ? item.password : "•".repeat(Math.min(Math.max(item.password.length, 8), 16))}</span><button className="icon-action" aria-label={revealed[item.id] ? "Hide password" : "Reveal password"} onClick={() => setRevealed((value) => ({ ...value, [item.id]: !value[item.id] }))}>{revealed[item.id] ? "◉" : "◌"}</button><button className="icon-action" aria-label="Copy password" onClick={() => copyValue(item.password, `${item.id}-password`)}>{copied === `${item.id}-password` ? "✓" : "▢"}</button></div>
              <div><span className={`strength-tag ${strength.toLowerCase()}`}>{strength}</span></div>
              <div className="row-actions"><button className="icon-action" aria-label={`View password history${item.history?.length ? ` (${item.history.length} previous versions)` : ""}`} title={`${item.history?.length || 0} previous password changes`} onClick={() => openHistory(item)}>↺{item.history?.length ? <sup>{item.history.length}</sup> : null}</button><button className="icon-action" aria-label="Edit credential" onClick={() => openEdit(item)}>✎</button><button className="icon-action delete-action" aria-label="Delete credential" onClick={() => removeCredential(item.id)}>×</button></div>
            </article>;
          })}
        </section>
      </main>

      <footer className="replica-footer"><span>PassVault — Hand-crafted personal credential manager</span><span>Clipboard clears after 30 seconds&nbsp;&nbsp; Press <kbd>/</kbd> to search&nbsp;&nbsp; Press <kbd>A</kbd> to add account</span></footer>

      <PasswordHistoryModal
        isOpen={Boolean(selectedHistoryAccount)}
        onClose={() => setSelectedHistoryAccount(null)}
        account={selectedHistoryAccount}
        onRestorePassword={restoreHistoricalPassword}
        onClearHistory={clearPasswordHistory}
      />

      {drawerOpen && <div className={`drawer-scrim${drawerClosing ? " is-closing" : ""}`} onMouseDown={(event) => { if (event.target === event.currentTarget) closeDrawer(); }}>
        <aside className={`credential-drawer${drawerClosing ? " is-closing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="drawer-title">
          <div className="drawer-heading"><h2 id="drawer-title">{editingId ? "Edit credential" : "Add new credential"}</h2><button aria-label="Close" onClick={closeDrawer}>×</button></div>
          <form className="credential-form" onSubmit={saveCredential}>
            <label className="service-field">
              Service or website
              <input
                autoFocus
                required
                value={form.service}
                onChange={(event) => { setForm({ ...form, service: event.target.value }); setServiceSuggestionIndex(0); setServiceSuggestionsDismissed(false); }}
                onKeyDown={handleServiceKeyDown}
                placeholder="e.g. Netflix, Stripe, Notion"
                role="combobox"
                aria-autocomplete="list"
                aria-controls="service-suggestions"
                aria-expanded={serviceSuggestions.length > 0}
              />
              {serviceSuggestions.length > 0 && (
                <div id="service-suggestions" className="service-suggestions" role="listbox">
                  {serviceSuggestions.map((service, index) => (
                    <button
                      key={service}
                      type="button"
                      role="option"
                      aria-selected={index === serviceSuggestionIndex}
                      className={index === serviceSuggestionIndex ? "active" : ""}
                      onMouseEnter={() => setServiceSuggestionIndex(index)}
                      onClick={() => { setForm((value) => ({ ...value, service })); setServiceSuggestionsDismissed(true); }}
                    >
                      <span className="suggestion-icon">{service.charAt(0)}</span>
                      <span>{service}</span>
                    </button>
                  ))}
                </div>
              )}
            </label>
            <fieldset><legend>Category</legend><div className="form-categories">{CATEGORIES.map((value) => <button type="button" key={value} className={form.category === value ? "selected" : ""} onClick={() => setForm({ ...form, category: value })}>{value}</button>)}</div></fieldset>
            <label>Username or email<input required value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="name@domain.com or handle" /></label>
            <label>Password<div className="password-entry"><input type="password" autoComplete={editingId ? "current-password" : "new-password"} required value={form.password} onChange={(event) => { setForm({ ...form, password: event.target.value }); setCurrentPasswordConfirmation(""); setNewPasswordConfirmation(""); setCredentialFormError(""); }} placeholder="Enter or generate" /><button type="button" onClick={generatePassword}>Generate</button></div>{form.password && <small className="password-tip">Tip: generated passphrases are 18 characters with high entropy.</small>}</label>
            {isChangingPassword && <div className="password-confirmation-fields">
              <label>Current password<input type="password" autoComplete="current-password" required value={currentPasswordConfirmation} onChange={(event) => { setCurrentPasswordConfirmation(event.target.value); setCredentialFormError(""); }} placeholder="Enter the current account password" /></label>
              <label>Confirm new password<input type="password" autoComplete="new-password" required value={newPasswordConfirmation} onChange={(event) => { setNewPasswordConfirmation(event.target.value); setCredentialFormError(""); }} placeholder="Re-enter the new password" /></label>
            </div>}
            <label>Optional note<input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Recovery pin, security question, seed hint" /></label>
            {credentialFormError && <p className="credential-form-error" role="alert">{credentialFormError}</p>}
            <div className="drawer-actions"><button type="button" className="cancel-button" onClick={closeDrawer}>Cancel</button><button type="submit" className="save-button" disabled={isSaving}>{isSaving ? "Saving…" : "Save to vault"}</button></div>
          </form>
        </aside>
      </div>}
      {/* BUG #2 FIX: LockScreenModal re-derives vault key after F5 refresh instead of full logout */}
      <LockScreenModal
        isOpen={isVaultLocked}
        user={session.user}
        hasVaultKey={Boolean(vaultKey)}
        onUnlock={handlePinUnlock}
        onUnlockWithMasterPassword={handleUnlockWithMasterPassword}
        onLogout={handleLogout}
        onTimeoutChange={updateAutoLockMinutes}
      />
      <AuthOverlay open={authModalOpen && !isVaultLocked} mode={authModalMode} onClose={() => { if (!isVaultLocked) setAuthModalOpen(false); }} onAuthenticated={handleAuthenticated} />
    </div>
  );
}

export default App;
