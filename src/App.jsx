import { useEffect, useMemo, useRef, useState } from "react";
import LandingPage from "./Component/LandingPage";
import Auth from "./Component/Auth";
import { encryptCredential, decryptCredential, encryptCustomFields, decryptCustomFields, clearCachedVaultKey } from "./utils/cryptoVault";
import { secureFetch } from "./utils/csrf";

const CATEGORIES = ["Personal", "Finance", "Work", "Developer"];
const initialForm = { service: "", category: "Personal", username: "", password: "", note: "" };
const POPULAR_SERVICES = ["Netflix", "Stripe", "Notion", "YouTube", "Google", "GitHub", "Amazon", "Facebook", "Instagram", "Microsoft"];
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/passwords";
const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL ?? "http://localhost:3000/api/auth";

function passwordStrength(value) {
  if (!value) return "";
  if (value.length < 10) return "Weak";
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
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [revealed, setRevealed] = useState({});
  const [copied, setCopied] = useState("");
  const [showLanding, setShowLanding] = useState(true);
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
  }

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
        const customFields = Array.isArray(item.customFields) ? await decryptCustomFields(item.customFields, vaultKey) : [];
        const note = customFields.find((field) => field.label === "Note")?.value || "";
        return { ...item, service: item.site, password, category: item.tag === "Development" ? "Developer" : (item.tag || "Personal"), note, customFields };
      })))
      .then((items) => { if (!cancelled) setCredentials(items); })
      .catch((error) => { if (!cancelled) setVaultError(error.message); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [session.user, session.token, vaultKey]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") setDrawerOpen(false);
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
    setForm(initialForm); setEditingId(null); setServiceSuggestionIndex(0); setDrawerOpen(true);
  }

  function openEdit(item) {
    setForm({ service: item.service, category: item.category, username: item.username, password: item.password, note: item.note || "" });
    setEditingId(item.id); setDrawerOpen(true);
  }

  const serviceSuggestions = useMemo(() => {
    const term = form.service.trim().toLowerCase();
    if (!term) return [];

    const savedServices = credentials.map((item) => item.service).filter(Boolean);
    return [...new Set([...savedServices, ...POPULAR_SERVICES])]
      .filter((service) => service.toLowerCase().includes(term))
      .slice(0, 6);
  }, [credentials, form.service]);

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
    } else if (event.key === "Escape") {
      setServiceSuggestionIndex(0);
    }
  }

  async function saveCredential(event) {
    event.preventDefault();
    if (!session.user || !vaultKey) {
      setVaultError("Sign in to save credentials to your account.");
      setDrawerOpen(false);
      setShowLanding(true);
      return;
    }
    const existing = credentials.find((item) => item.id === editingId);
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
    };
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
        ? items.map((item) => item.id === id ? { ...item, ...form, site: payload.site, tag: payload.tag } : item)
        : [...items, { ...form, id, site: payload.site, tag: payload.tag, favorite: false }]);
      setDrawerOpen(false);
      setForm(initialForm);
    } catch (error) {
      setVaultError(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  function generatePassword() {
    const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
    const bytes = crypto.getRandomValues(new Uint8Array(18));
    setForm((value) => ({ ...value, password: Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("") }));
  }

  async function copyValue(value, id) {
    try { await navigator.clipboard.writeText(value); setCopied(id); window.setTimeout(() => setCopied(""), 1300); } catch { /* Clipboard access can be blocked by the browser. */ }
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
          <button className="summary-review" disabled={!weakCount} onClick={() => setWeakOnly((value) => !value)}>{weakOnly ? "Show all passwords" : weakCount ? `Review ${weakCount} vulnerable password${weakCount === 1 ? "" : "s"}` : "All passwords look good"}<span aria-hidden="true">›</span></button>
        </section>

        <div className="list-toolbar">
          <div className="quick-search">
            <label className="search-box"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/></svg><input ref={searchRef} value={query} onChange={(event) => { setQuery(event.target.value); setActiveSuggestion(0); }} onKeyDown={handleSearchKeyDown} placeholder="Search by name, username or service..." aria-label="Search credentials" aria-autocomplete="list" aria-controls="quick-search-suggestions" aria-expanded={searchSuggestions.length > 0}/><kbd>/</kbd></label>
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
              <div className="row-actions"><button className="icon-action" aria-label="Edit credential" onClick={() => openEdit(item)}>✎</button><button className="icon-action delete-action" aria-label="Delete credential" onClick={() => removeCredential(item.id)}>×</button></div>
            </article>;
          })}
        </section>
      </main>

      <footer className="replica-footer"><span>PassVault — Hand-crafted personal credential manager</span><span>Press <kbd>/</kbd> to search&nbsp;&nbsp; Press <kbd>A</kbd> to add account&nbsp;&nbsp; Press <kbd>Esc</kbd> to close</span></footer>

      {drawerOpen && <div className="drawer-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) setDrawerOpen(false); }}>
        <aside className="credential-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
          <div className="drawer-heading"><h2 id="drawer-title">{editingId ? "Edit credential" : "Add new credential"}</h2><button aria-label="Close" onClick={() => setDrawerOpen(false)}>×</button></div>
          <form className="credential-form" onSubmit={saveCredential}>
            <label className="service-field">
              Service or website
              <input
                autoFocus
                required
                value={form.service}
                onChange={(event) => { setForm({ ...form, service: event.target.value }); setServiceSuggestionIndex(0); }}
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
                      onClick={() => setForm((value) => ({ ...value, service }))}
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
            <label>Password<div className="password-entry"><input required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Enter or generate"/><button type="button" onClick={generatePassword}>Generate</button></div>{form.password && <small className="password-tip">Tip: generated passphrases are 18 characters with high entropy.</small>}</label>
            <label>Optional note<input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Recovery pin, security question, seed hint" /></label>
            <div className="drawer-actions"><button type="button" className="cancel-button" onClick={() => setDrawerOpen(false)}>Cancel</button><button type="submit" className="save-button" disabled={isSaving}>{isSaving ? "Saving…" : "Save to vault"}</button></div>
          </form>
        </aside>
      </div>}
      <AuthOverlay open={authModalOpen} mode={authModalMode} onClose={() => setAuthModalOpen(false)} onAuthenticated={handleAuthenticated} />
    </div>
  );
}

export default App;
