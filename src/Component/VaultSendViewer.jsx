import { useState, useEffect } from "react";
import { secureFetch } from "../utils/csrf";
import { decryptSendPayload, hashPassphrase } from "../utils/cryptoVault";

const SENDS_API_URL = import.meta.env.VITE_SENDS_API_URL ?? "http://localhost:3000/api/sends";

export default function VaultSendViewer({ sendId, keyHex, onDismiss, theme = "light" }) {
  const [meta, setMeta] = useState(null);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState("");

  const [passphrase, setPassphrase] = useState("");
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealError, setRevealError] = useState("");

  // Revealed and decrypted secret content
  const [secretContent, setSecretContent] = useState(null);
  const [burnedNotice, setBurnedNotice] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // 1. Fetch metadata (checks if secret still exists, without burning a view)
  useEffect(() => {
    let isCancelled = false;

    const checkMeta = async () => {
      setIsLoadingMeta(true);
      setMetaError("");
      try {
        const res = await secureFetch(`${SENDS_API_URL}/meta/${sendId}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "This secret does not exist or has expired.");
        }
        const data = await res.json();
        if (!isCancelled) {
          setMeta(data);
        }
      } catch (err) {
        if (!isCancelled) {
          setMetaError(err.message || "Failed to load secret metadata.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingMeta(false);
        }
      }
    };

    if (sendId) {
      void checkMeta();
    }

    return () => {
      isCancelled = true;
    };
  }, [sendId]);

  // 2. Reveal and Decrypt
  const handleRevealSecret = async (e) => {
    if (e) e.preventDefault();
    if (!keyHex) {
      setRevealError("Missing decryption key in the link URL fragment.");
      return;
    }

    if (meta?.hasPassphrase && !passphrase.trim()) {
      setRevealError("This secret is protected by a passphrase. Please enter it to reveal.");
      return;
    }

    setIsRevealing(true);
    setRevealError("");

    try {
      // Calculate passphrase hash if required
      let passphraseHash = null;
      if (meta?.hasPassphrase) {
        passphraseHash = await hashPassphrase(passphrase.trim(), meta.passphraseSalt);
      }

      const res = await secureFetch(`${SENDS_API_URL}/reveal/${sendId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphraseHash }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to reveal secret.");
      }

      const data = await res.json();

      // Zero-Knowledge Client-Side Decryption
      const plainText = await decryptSendPayload(data.ciphertext, data.iv, keyHex);

      setSecretContent({
        text: plainText,
        title: data.title,
        type: data.type,
        viewsLeft: data.viewsLeft,
        burnedNow: data.burnedNow,
      });

      if (data.burnedNow) {
        setBurnedNotice(true);
      }
    } catch (err) {
      console.error("Failed to decrypt send:", err);
      setRevealError(err.message || "Failed to decrypt secret. Ensure the passphrase or link key is correct.");
    } finally {
      setIsRevealing(false);
    }
  };

  const handleCopy = () => {
    if (!secretContent?.text) return;
    navigator.clipboard.writeText(secretContent.text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          theme === "dark"
            ? "border-[#21262d] bg-[#0d1117] text-[#e6edf3]"
            : "border-[#d5d0c8] bg-white text-[#1f2933]"
        }`}
      >
        {/* Top Banner */}
        <div
          className={`flex items-center justify-between border-b px-6 py-4 ${
            theme === "dark" ? "border-[#21262d] bg-[#161b22]" : "border-[#ede8e1] bg-[#faf9f7]"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#176b87] to-[#0d9488] text-white shadow-sm">
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="font-['Space_Grotesk'] text-base font-bold">
                PassVault Send
              </h3>
              <p className="text-[11px] text-[#6f6a63] dark:text-[#8b949e]">
                Encrypted One-Time Secret Transmission
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg p-1.5 text-[#6f6a63] hover:bg-slate-100 dark:text-[#8b949e] dark:hover:bg-[#21262d] transition"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-5">
          {isLoadingMeta ? (
            <div className="py-12 text-center text-xs text-[#6f6a63] dark:text-[#8b949e]">
              <svg className="mx-auto mb-2 h-6 w-6 animate-spin text-[#176b87]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Checking secret availability...</span>
            </div>
          ) : metaError ? (
            /* Error / Burned / Expired state */
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h4 className="font-['Space_Grotesk'] text-lg font-bold text-rose-700 dark:text-rose-400">
                  Secret Unavailable
                </h4>
                <p className="mt-1 text-xs text-[#6f6a63] dark:text-[#8b949e] max-w-sm mx-auto">
                  {metaError}
                </p>
              </div>
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-lg bg-[#176b87] px-5 py-2 text-xs font-bold text-white hover:bg-[#145d74]"
              >
                Go to Home
              </button>
            </div>
          ) : secretContent ? (
            /* Successfully Decrypted View */
            <div className="space-y-4 animate-in fade-in duration-200">
              {burnedNotice && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <span>🔥</span>
                  <span>
                    <strong>This secret has now self-destructed.</strong> It has been permanently deleted from the database and cannot be viewed again.
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#6f6a63] dark:text-[#8b949e]">
                    {secretContent.title || "Decrypted Secret"}
                  </span>
                  <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    AES-256-GCM Decrypted
                  </span>
                </div>

                <div className="relative">
                  <textarea
                    readOnly
                    rows={5}
                    value={secretContent.text}
                    className="w-full rounded-xl border border-[#d5d0c8] bg-[#faf9f7] p-3.5 font-mono text-xs text-[#1f2933] select-all dark:border-[#30363d] dark:bg-[#090d13] dark:text-[#e6edf3]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-bold transition shadow-sm ${
                    isCopied
                      ? "bg-emerald-600 text-white"
                      : "bg-[#176b87] text-white hover:bg-[#145d74]"
                  }`}
                >
                  {isCopied ? "✓ Copied to Clipboard!" : "Copy Secret"}
                </button>

                <button
                  type="button"
                  onClick={onDismiss}
                  className="rounded-lg border border-[#d5d0c8] bg-white px-4 py-2 text-xs font-semibold text-[#4b5563] hover:bg-[#faf9f7] dark:border-[#30363d] dark:bg-[#161b22] dark:text-[#c9d1d9] dark:hover:bg-[#21262d]"
                >
                  Close & Clear
                </button>
              </div>
            </div>
          ) : (
            /* Confirmation & Passphrase prompt before revealing */
            <div className="space-y-4">
              <div
                className={`rounded-xl border p-4 text-xs space-y-2 ${
                  theme === "dark" ? "border-[#21262d] bg-[#161b22]/50" : "border-[#ede8e1] bg-[#faf9f7]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#1f2933] dark:text-[#e6edf3]">
                    {meta?.title}
                  </span>
                  <span className="rounded bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-mono">
                    {meta?.type}
                  </span>
                </div>

                <p className="text-[#6f6a63] dark:text-[#8b949e]">
                  This confidential secret will be decrypted locally in your browser. Revealing it consumes 1 view of {meta?.maxViews} total views allowed.
                </p>

                <div className="flex items-center gap-4 pt-1 text-[11px] text-[#7b746b]">
                  <span>Views left: <strong>{meta?.viewsLeft}</strong></span>
                  <span>Expires: {meta?.expiresAt ? new Date(meta.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Soon'}</span>
                </div>
              </div>

              {meta?.hasPassphrase && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6f6a63] dark:text-[#8b949e]">
                    Passphrase Required
                  </label>
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Enter the secret passphrase..."
                    className="w-full rounded-lg border border-[#d5d0c8] bg-white px-3.5 py-2 text-xs text-[#1f2933] placeholder:text-[#aaa39a] focus:border-[#176b87] focus:outline-none dark:border-[#30363d] dark:bg-[#090d13] dark:text-[#e6edf3]"
                    required
                  />
                </div>
              )}

              {revealError && (
                <div className="rounded-lg border border-rose-300 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400">
                  {revealError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onDismiss}
                  className="rounded-lg border border-[#d5d0c8] bg-white px-4 py-2 text-xs font-semibold text-[#4b5563] hover:bg-[#faf9f7] dark:border-[#30363d] dark:bg-[#161b22] dark:text-[#c9d1d9] dark:hover:bg-[#21262d]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleRevealSecret}
                  disabled={isRevealing}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#176b87] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#145d74] disabled:opacity-50"
                >
                  {isRevealing ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      <span>Decrypting in browser...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>Reveal Secret</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
