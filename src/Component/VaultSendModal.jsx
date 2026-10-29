import { useState, useEffect, useCallback } from "react";
import { secureFetch } from "../utils/csrf";
import {
  generateSendSecretKey,
  encryptSendPayload,
  hashPassphrase,
  generatePassphraseSalt,
} from "../utils/cryptoVault";

const SENDS_API_URL = import.meta.env.VITE_SENDS_API_URL ?? "http://localhost:3000/api/sends";

export default function VaultSendModal({
  isOpen,
  onClose,
  initialData = null, // e.g. { title: 'GitHub credentials', text: 'secret_pw_123' }
  token = null,
  theme = "light",
}) {
  const [activeTab, setActiveTab] = useState("create"); // 'create' | 'manage'
  const [title, setTitle] = useState("");
  const [secretText, setSecretText] = useState("");
  const [secretType, setSecretType] = useState("text"); // 'text' | 'password' | 'note'
  const [maxViews, setMaxViews] = useState(1);
  const [expiresInMinutes, setExpiresInMinutes] = useState(1440); // 24 hours
  const [enablePassphrase, setEnablePassphrase] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Result state after creation
  const [generatedLink, setGeneratedLink] = useState("");
  const [createdMeta, setCreatedMeta] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

  // Manage existing sends
  const [mySends, setMySends] = useState([]);
  const [isLoadingSends, setIsLoadingSends] = useState(false);

  const loadMySends = useCallback(async () => {
    setIsLoadingSends(true);
    setErrorMsg("");
    try {
      const res = await secureFetch(`${SENDS_API_URL}/my`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error(`Could not load active sends (${res.status}).`);
      }
      const data = await res.json();
      setMySends(Array.isArray(data.sends) ? data.sends : []);
    } catch (error) {
      console.error("Failed to load PassVault Sends:", error);
      setErrorMsg(error.message || "Could not load active sends.");
    } finally {
      setIsLoadingSends(false);
    }
  }, [token]);

  // Initialize or reset when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setErrorMsg("");
        setGeneratedLink("");
        setCreatedMeta(null);
        setIsCopied(false);

        if (initialData) {
          setTitle(initialData.title || "");
          setSecretText(initialData.text || "");
          setSecretType(initialData.type || "password");
        } else {
          setTitle("");
          setSecretText("");
          setSecretType("text");
        }
        setActiveTab("create");
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialData]);

  // Load user's active sends when switching to 'manage' tab
  useEffect(() => {
    /* legacy fetch implementation removed */
    /*
      const fetchSends = async () => {
        setIsLoadingSends(true);
        try {
          const res = await secureFetch(`${SENDS_API_URL}/my`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (res.ok) {
            const data = await res.json();
            setMySends(data.sends || []);
          }
        } catch (error) {
          console.error("Failed to load PassVault Sends:", error);
          setErrorMsg(error.message || "Could not load active sends.");
        } finally {
          setIsLoadingSends(false);
        }
      }
    */

    if (isOpen && activeTab === "manage") {
      const timer = setTimeout(() => {
        void loadMySends();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeTab, loadMySends]);

  const handleCreateSend = async (e) => {
    e.preventDefault();
    if (!secretText.trim()) {
      setErrorMsg("Please enter the secret text or password to share.");
      return;
    }

    if (enablePassphrase && !passphrase.trim()) {
      setErrorMsg("Please provide the protection passphrase or uncheck password protection.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      // 1. Generate client-side ephemeral 256-bit AES-GCM key
      const { cryptoKey, keyHex } = await generateSendSecretKey();

      // 2. Encrypt plaintext in the browser
      const { ciphertextHex, ivHex } = await encryptSendPayload(secretText, cryptoKey);

      // 3. Optional passphrase hash
      let passphraseHash = null;
      let passphraseSalt = null;
      if (enablePassphrase && passphrase.trim()) {
        passphraseSalt = generatePassphraseSalt();
        passphraseHash = await hashPassphrase(passphrase.trim(), passphraseSalt);
      }

      // 4. Send ONLY ciphertext and IV to server (Zero-Knowledge)
      const res = await secureFetch(SENDS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ciphertext: ciphertextHex,
          iv: ivHex,
          title: title.trim() || (secretType === "password" ? "Secure Password" : "Confidential Secret"),
          type: secretType,
          maxViews: Number(maxViews) || 1,
          expiresInMinutes: Number(expiresInMinutes) || 1440,
          passphraseHash,
          passphraseSalt,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Server returned ${res.status}`);
      }

      const data = await res.json();

      // 5. Construct client-side URL with #key=keyHex
      const origin = window.location.origin;
      const shareUrl = `${origin}/#sendId=${data.sendId}&key=${keyHex}`;

      setGeneratedLink(shareUrl);
      setCreatedMeta({
        sendId: data.sendId,
        expiresAt: new Date(data.expiresAt),
        maxViews: data.maxViews,
        hasPassphrase: Boolean(enablePassphrase && passphrase.trim()),
      });
    } catch (err) {
      console.error("Failed to create PassVault Send:", err);
      setErrorMsg(err.message || "Failed to create encrypted secret link.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleBurnSend = async (sendId) => {
    if (!window.confirm("Permanently burn and destroy this secret immediately?")) return;
    try {
      const res = await secureFetch(`${SENDS_API_URL}/${sendId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setMySends((prev) => prev.filter((s) => s.sendId !== sendId));
      }
    } catch (err) {
      console.error("Failed to burn send:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative flex w-full max-w-2xl flex-col max-h-[90vh] rounded-2xl border shadow-2xl transition-all overflow-hidden ${
          theme === "dark"
            ? "border-[#21262d] bg-[#0d1117] text-[#e6edf3]"
            : "border-[#d5d0c8] bg-white text-[#1f2933]"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b px-6 py-4 ${
            theme === "dark" ? "border-[#21262d] bg-[#161b22]" : "border-[#ede8e1] bg-[#faf9f7]"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#176b87] to-[#0d9488] text-white shadow-sm">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-['Space_Grotesk'] text-lg font-bold tracking-tight">
                  PassVault Send
                </h3>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Zero-Knowledge End-to-End
                </span>
              </div>
              <p className="text-xs text-[#6f6a63] dark:text-[#8b949e]">
                Share self-destructing passwords & sensitive notes securely with one-time links.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#6f6a63] hover:bg-slate-100 hover:text-[#1f2933] dark:text-[#8b949e] dark:hover:bg-[#21262d] dark:hover:text-[#e6edf3] transition"
            aria-label="Close modal"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          className={`flex border-b px-6 pt-2 text-xs font-semibold ${
            theme === "dark" ? "border-[#21262d] bg-[#161b22]" : "border-[#ede8e1] bg-[#faf9f7]"
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={`pb-2.5 px-3 border-b-2 transition-all ${
              activeTab === "create"
                ? "border-[#176b87] text-[#176b87] dark:border-[#38bdf8] dark:text-[#38bdf8]"
                : "border-transparent text-[#6f6a63] hover:text-[#1f2933] dark:text-[#8b949e] dark:hover:text-[#e6edf3]"
            }`}
          >
            Create New Send
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("manage")}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "manage"
                ? "border-[#176b87] text-[#176b87] dark:border-[#38bdf8] dark:text-[#38bdf8]"
                : "border-transparent text-[#6f6a63] hover:text-[#1f2933] dark:text-[#8b949e] dark:hover:text-[#e6edf3]"
            }`}
          >
            <span>My Active Sends</span>
            {mySends.length > 0 && (
              <span className="rounded-full bg-[#176b87]/20 px-1.5 py-0.2 text-[10px] font-bold">
                {mySends.length}
              </span>
            )}
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400">
              {errorMsg}
            </div>
          )}

          {activeTab === "create" ? (
            generatedLink ? (
              /* Success / Result View */
              <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 dark:bg-emerald-950/20 text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h4 className="font-['Space_Grotesk'] text-base font-bold text-emerald-800 dark:text-emerald-300">
                    Secret Encrypted & Armed!
                  </h4>
                  <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400/90 max-w-md mx-auto">
                    The encryption key is embedded ONLY in the link fragment after the hash (#). The server never sees the key and cannot decrypt this secret.
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#6f6a63] dark:text-[#8b949e]">
                    One-Time Shareable Link
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedLink}
                      className="w-full rounded-lg border border-[#d5d0c8] bg-[#faf9f7] px-3.5 py-2.5 font-mono text-xs text-[#1f2933] select-all dark:border-[#30363d] dark:bg-[#090d13] dark:text-[#e6edf3]"
                      onClick={(e) => e.target.select()}
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-bold transition shadow-sm ${
                        isCopied
                          ? "bg-emerald-600 text-white"
                          : "bg-[#176b87] text-white hover:bg-[#145d74]"
                      }`}
                    >
                      {isCopied ? "✓ Copied!" : "Copy Link"}
                    </button>
                  </div>
                </div>

                {/* Secret Parameters Summary */}
                <div
                  className={`grid grid-cols-3 gap-3 rounded-xl border p-3.5 text-center text-xs ${
                    theme === "dark" ? "border-[#21262d] bg-[#161b22]" : "border-[#ede8e1] bg-[#faf9f7]"
                  }`}
                >
                  <div>
                    <span className="block text-[10px] font-semibold uppercase text-[#6f6a63] dark:text-[#8b949e]">
                      Self-Destruct
                    </span>
                    <span className="font-bold text-[#1f2933] dark:text-[#e6edf3]">
                      After {createdMeta?.maxViews} {createdMeta?.maxViews === 1 ? "view" : "views"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold uppercase text-[#6f6a63] dark:text-[#8b949e]">
                      Expires
                    </span>
                    <span className="font-bold text-[#1f2933] dark:text-[#e6edf3]">
                      {createdMeta?.expiresAt ? createdMeta.expiresAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "24h"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold uppercase text-[#6f6a63] dark:text-[#8b949e]">
                      Passphrase
                    </span>
                    <span className="font-bold text-[#1f2933] dark:text-[#e6edf3]">
                      {createdMeta?.hasPassphrase ? "🔒 Protected" : "None"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGeneratedLink("");
                      setCreatedMeta(null);
                      setSecretText("");
                    }}
                    className="text-xs font-semibold text-[#176b87] hover:underline dark:text-[#38bdf8]"
                  >
                    + Create Another Secret
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-[#d5d0c8] bg-white px-4 py-2 text-xs font-medium text-[#4b5563] hover:bg-[#faf9f7] dark:border-[#30363d] dark:bg-[#161b22] dark:text-[#c9d1d9] dark:hover:bg-[#21262d]"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Create Form */
              <form onSubmit={handleCreateSend} className="space-y-4">
                {/* Optional Title / Label */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#6f6a63] dark:text-[#8b949e]">
                    Title or Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Production DB Password or Wi-Fi Key"
                    className="w-full rounded-lg border border-[#d5d0c8] bg-[#faf9f7] px-3.5 py-2 text-xs text-[#1f2933] placeholder:text-[#aaa39a] transition focus:border-[#176b87] focus:outline-none dark:border-[#30363d] dark:bg-[#090d13] dark:text-[#e6edf3]"
                  />
                </div>

                {/* Secret Payload */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#6f6a63] dark:text-[#8b949e]">
                      Confidential Secret Content
                    </label>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setSecretType("password")}
                        className={`px-2 py-0.5 rounded font-medium transition ${
                          secretType === "password"
                            ? "bg-[#176b87] text-white"
                            : "text-[#6f6a63] hover:bg-slate-200 dark:hover:bg-[#21262d]"
                        }`}
                      >
                        Password
                      </button>
                      <button
                        type="button"
                        onClick={() => setSecretType("text")}
                        className={`px-2 py-0.5 rounded font-medium transition ${
                          secretType === "text"
                            ? "bg-[#176b87] text-white"
                            : "text-[#6f6a63] hover:bg-slate-200 dark:hover:bg-[#21262d]"
                        }`}
                      >
                        Text / Token
                      </button>
                      <button
                        type="button"
                        onClick={() => setSecretType("note")}
                        className={`px-2 py-0.5 rounded font-medium transition ${
                          secretType === "note"
                            ? "bg-[#176b87] text-white"
                            : "text-[#6f6a63] hover:bg-slate-200 dark:hover:bg-[#21262d]"
                        }`}
                      >
                        Note
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={4}
                    value={secretText}
                    onChange={(e) => setSecretText(e.target.value)}
                    placeholder="Enter the sensitive password, API secret, private key, or confidential message..."
                    className="w-full rounded-lg border border-[#d5d0c8] bg-[#faf9f7] p-3 font-mono text-xs text-[#1f2933] placeholder:text-[#aaa39a] transition focus:border-[#176b87] focus:outline-none dark:border-[#30363d] dark:bg-[#090d13] dark:text-[#e6edf3]"
                    required
                  />
                </div>

                {/* Expiry & Views Configuration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#6f6a63] dark:text-[#8b949e]">
                      Max Allowed Views
                    </label>
                    <select
                      value={maxViews}
                      onChange={(e) => setMaxViews(Number(e.target.value))}
                      className="w-full rounded-lg border border-[#d5d0c8] bg-[#faf9f7] px-3 py-2 text-xs text-[#1f2933] transition focus:border-[#176b87] focus:outline-none dark:border-[#30363d] dark:bg-[#090d13] dark:text-[#e6edf3]"
                    >
                      <option value={1}>1 View (Burn immediately after reading)</option>
                      <option value={2}>2 Views</option>
                      <option value={5}>5 Views</option>
                      <option value={10}>10 Views</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#6f6a63] dark:text-[#8b949e]">
                      Expiration Lifetime
                    </label>
                    <select
                      value={expiresInMinutes}
                      onChange={(e) => setExpiresInMinutes(Number(e.target.value))}
                      className="w-full rounded-lg border border-[#d5d0c8] bg-[#faf9f7] px-3 py-2 text-xs text-[#1f2933] transition focus:border-[#176b87] focus:outline-none dark:border-[#30363d] dark:bg-[#090d13] dark:text-[#e6edf3]"
                    >
                      <option value={60}>1 Hour</option>
                      <option value={720}>12 Hours</option>
                      <option value={1440}>1 Day (24 Hours)</option>
                      <option value={4320}>3 Days</option>
                      <option value={10080}>7 Days</option>
                    </select>
                  </div>
                </div>

                {/* Extra Protection Passphrase */}
                <div
                  className={`rounded-xl border p-4 transition-all ${
                    theme === "dark" ? "border-[#21262d] bg-[#161b22]/50" : "border-[#ede8e1] bg-[#faf9f7]"
                  }`}
                >
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={enablePassphrase}
                      onChange={(e) => setEnablePassphrase(e.target.checked)}
                      className="h-4 w-4 rounded border-[#d5d0c8] text-[#176b87] focus:ring-0"
                    />
                    <span className="text-xs font-semibold text-[#1f2933] dark:text-[#e6edf3]">
                      Require an extra passphrase to unlock
                    </span>
                  </label>

                  {enablePassphrase && (
                    <div className="mt-3 animate-in fade-in duration-150">
                      <input
                        type="password"
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        placeholder="Enter secret passphrase (recipient must provide this to reveal)"
                        className="w-full rounded-lg border border-[#d5d0c8] bg-white px-3.5 py-2 text-xs text-[#1f2933] placeholder:text-[#aaa39a] transition focus:border-[#176b87] focus:outline-none dark:border-[#30363d] dark:bg-[#090d13] dark:text-[#e6edf3]"
                      />
                      <p className="mt-1 text-[11px] text-[#6f6a63] dark:text-[#8b949e]">
                        Share this passphrase through a secondary channel (e.g. Signal or SMS) for maximum security.
                      </p>
                    </div>
                  )}
                </div>

                {/* Submit Action */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-[#d5d0c8] bg-white px-4 py-2 text-xs font-semibold text-[#4b5563] hover:bg-[#faf9f7] dark:border-[#30363d] dark:bg-[#161b22] dark:text-[#c9d1d9] dark:hover:bg-[#21262d]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#176b87] px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#145d74] disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                        <span>Encrypting in browser...</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>Generate Encrypted Link</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )
          ) : (
            /* Manage Active Sends View */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#6f6a63] dark:text-[#8b949e]">
                  Active secrets created from your account that haven't been fully burned or expired yet.
                </span>
                <button
                  type="button"
                  onClick={loadMySends}
                  className="text-xs font-semibold text-[#176b87] hover:underline dark:text-[#38bdf8]"
                >
                  Refresh ↻
                </button>
              </div>

              {isLoadingSends ? (
                <div className="py-12 text-center text-xs text-[#6f6a63] dark:text-[#8b949e]">
                  Loading your active sends...
                </div>
              ) : mySends.length === 0 ? (
                <div
                  className={`rounded-xl border p-8 text-center text-xs ${
                    theme === "dark" ? "border-[#21262d] bg-[#161b22]/30" : "border-[#ede8e1] bg-[#faf9f7]"
                  }`}
                >
                  <p className="font-medium text-[#6f6a63] dark:text-[#8b949e]">
                    No active sends found.
                  </p>
                  <p className="mt-1 text-[11px] text-[#8c857b]">
                    When you create encrypted share links, they will be listed here until they self-destruct.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#ede8e1] dark:divide-[#21262d] rounded-xl border border-[#ede8e1] dark:border-[#21262d] overflow-hidden">
                  {mySends.map((send) => (
                    <div
                      key={send.sendId}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition ${
                        theme === "dark" ? "bg-[#161b22]/40 hover:bg-[#161b22]" : "bg-white hover:bg-[#faf9f7]"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-[#1f2933] dark:text-[#e6edf3]">
                            {send.title}
                          </span>
                          <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-[#6f6a63] dark:text-[#8b949e]">
                            {send.type}
                          </span>
                          {send.hasPassphrase && (
                            <span className="rounded bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                              Passphrase Protected
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-[11px] text-[#6f6a63] dark:text-[#8b949e]">
                          <span>
                            Views left: <strong>{send.viewsLeft}</strong> of {send.maxViews}
                          </span>
                          <span>
                            Expires: {new Date(send.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleBurnSend(send.sendId)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition"
                        >
                          🔥 Burn Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
