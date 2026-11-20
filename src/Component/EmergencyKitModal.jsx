import { useState, useEffect, useMemo } from 'react';
import {
  generate24WordRecoveryKey,
  validateRecoveryKey,
  createEmergencyRescueBlob,
  deriveRawVaultKeyBytes,
  generateEmergencyKitText,
} from '../utils/recoveryKit';
import { generateQRCodeSVG } from '../utils/qrcode';
import { secureFetch } from '../utils/csrf';
import { logAuditEvent, AUDIT_CATEGORIES, AUDIT_EVENT_TYPES } from '../utils/auditLogger';

export default function EmergencyKitModal({
  isOpen,
  onClose,
  userEmail = 'user@example.com',
  vaultSalt = '',
}) {
  const [activeTab, setActiveTab] = useState('kit'); // 'kit' | 'verify'
  const [recoveryKeyData, setRecoveryKeyData] = useState(null); // { words, keyString, entropyHex }
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavedToBackend, setIsSavedToBackend] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [masterPasswordInput, setMasterPasswordInput] = useState('');
  const [showWords, setShowWords] = useState(true);
  const [copiedWords, setCopiedWords] = useState(false);
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState(null); // { valid: boolean, message: string }

  // Generate key on first open if not generated yet
  useEffect(() => {
    if (isOpen && !recoveryKeyData) {
      void handleGenerateNewKey();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function handleGenerateNewKey() {
    setIsGenerating(true);
    setSaveError('');
    setIsSavedToBackend(false);
    try {
      const data = await generate24WordRecoveryKey();
      setRecoveryKeyData(data);
    } catch (err) {
      console.error('Failed to generate recovery key:', err);
      setSaveError('Failed to generate cryptographic recovery key.');
    } finally {
      setIsGenerating(false);
    }
  }

  // QR Code payload
  const qrSvgString = useMemo(() => {
    if (!recoveryKeyData || !userEmail) return '';
    const payload = JSON.stringify({
      app: 'PassVault',
      email: userEmail,
      salt: vaultSalt || 'default',
      v: '1',
    });
    return generateQRCodeSVG(payload, { size: 140, color: '#0f172a', bg: '#ffffff', margin: 2 });
  }, [recoveryKeyData, userEmail, vaultSalt]);

  // Copy 24 words
  const handleCopyWords = async () => {
    if (!recoveryKeyData) return;
    try {
      await navigator.clipboard.writeText(recoveryKeyData.keyString);
      setCopiedWords(true);
      setTimeout(() => setCopiedWords(false), 2500);
      logAuditEvent(userEmail, {
        type: AUDIT_EVENT_TYPES.COPY_PASSWORD,
        title: 'Emergency Recovery Key Copied',
        description: '24-word recovery key was copied to clipboard.',
        severity: 'warning',
        category: AUDIT_CATEGORIES.SECURITY,
      });
    } catch {
      // Fallback
    }
  };

  // Download .txt backup
  const handleDownloadTxt = () => {
    if (!recoveryKeyData) return;
    const txtContent = generateEmergencyKitText({
      email: userEmail,
      accountSalt: vaultSalt,
      words: recoveryKeyData.words,
      createdAt: new Date(),
    });

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PassVault-Emergency-Kit-${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Native Print / Save as PDF
  const handlePrint = () => {
    window.print();
  };

  // Save / Register rescue blob on the server
  const handleSaveToVault = async (e) => {
    e?.preventDefault();
    if (!masterPasswordInput) {
      setSaveError('Enter your master password to wrap and activate your emergency rescue key.');
      return;
    }
    if (!recoveryKeyData) return;

    setIsSaving(true);
    setSaveError('');

    try {
      // 1. Derive raw 32-byte vault key
      const rawVaultBytes = await deriveRawVaultKeyBytes(
        masterPasswordInput,
        userEmail,
        vaultSalt || 'default'
      );

      // 2. Wrap into rescue blob with 24-word key
      const rescueBlob = await createEmergencyRescueBlob(
        rawVaultBytes,
        recoveryKeyData.keyString,
        vaultSalt || 'default'
      );

      // 3. Save to backend
      const res = await secureFetch('/api/auth/emergency-kit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emergencyRescueBlob: rescueBlob }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to save emergency kit to server.');
      }

      setIsSavedToBackend(true);
      setMasterPasswordInput('');

      logAuditEvent(userEmail, {
        type: AUDIT_EVENT_TYPES.EMERGENCY_KIT_CREATED,
        title: 'Emergency Recovery Kit Activated',
        description: 'New 24-word emergency rescue key generated and registered with vault.',
        severity: 'success',
        category: AUDIT_CATEGORIES.SECURITY,
      });
    } catch (err) {
      console.error('Error saving recovery kit:', err);
      setSaveError(err.message || 'Verification failed. Incorrect master password.');
    } finally {
      setIsSaving(false);
    }
  };

  // Test / Verify input words
  const handleVerify = async (e) => {
    e.preventDefault();
    setVerifyResult(null);
    if (!verifyInput.trim()) return;

    const res = await validateRecoveryKey(verifyInput);
    if (!res.valid) {
      setVerifyResult({ valid: false, message: res.error || 'Invalid recovery key.' });
      return;
    }

    if (recoveryKeyData && res.entropyHex === recoveryKeyData.entropyHex) {
      setVerifyResult({
        valid: true,
        message: '✓ Perfect match! This 24-word key matches your currently generated kit.',
      });
    } else {
      setVerifyResult({
        valid: true,
        message: '✓ Checksum valid! This is a structurally correct 24-word BIP-39 recovery key.',
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5 backdrop-blur-md animate-fadeIn overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-kit-title"
    >
      {/* ─── Printable Document (Only shown when printing via @media print) ─── */}
      <div className="hidden print:block print:w-full print:max-w-4xl print:p-8 print:bg-white print:text-black">
        <div className="border-4 border-slate-900 p-8 rounded-lg">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                PASSVAULT EMERGENCY RECOVERY KIT
              </h1>
              <p className="text-sm font-semibold text-slate-600 mt-1">
                Zero-Knowledge Cryptographic Backup Sheet
              </p>
            </div>
            <div className="text-right text-xs text-slate-600 font-mono">
              <p>CONFIDENTIAL</p>
              <p>{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-300 p-3 rounded mb-6 text-xs text-amber-900">
            <strong>⚠️ CRITICAL SECURITY INSTRUCTION:</strong> Keep this sheet in a fireproof safe, bank deposit box, or trusted physical location. Anyone with access to this sheet and your email address can recover your encrypted vault.
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-xs border border-slate-300 p-4 rounded bg-slate-50 font-mono">
            <div>
              <span className="text-slate-500 block uppercase">Account Email</span>
              <span className="font-bold text-slate-900 text-sm">{userEmail}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase">Account Identifier / Salt</span>
              <span className="font-bold text-slate-900 text-sm break-all">{vaultSalt || 'Registered'}</span>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-sm font-bold uppercase text-slate-900 tracking-wider mb-3">
              24-Word Cryptographic Emergency Recovery Key
            </h2>
            <div className="grid grid-cols-4 gap-2 font-mono text-sm">
              {recoveryKeyData?.words.map((word, idx) => (
                <div
                  key={idx}
                  className="border border-slate-300 rounded p-2 flex items-center bg-white shadow-sm"
                >
                  <span className="text-slate-400 text-xs w-6 mr-1">{String(idx + 1).padStart(2, '0')}.</span>
                  <span className="font-bold text-slate-900">{word}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6 border-t-2 border-slate-200 pt-6">
            {qrSvgString && (
              <div
                className="w-28 h-28 border border-slate-300 p-1 rounded"
                dangerouslySetInnerHTML={{ __html: qrSvgString }}
              />
            )}
            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-900">How to Recover Your Vault:</p>
              <p>1. Open the PassVault sign-in screen on any device.</p>
              <p>2. Select "Forgot Master Password? Recover with Emergency Kit".</p>
              <p>3. Enter your account email and the 24 words in the exact sequence above.</p>
              <p>4. Set a new master password. Your vault will be decrypted and safely re-secured.</p>
            </div>
          </div>

          <div className="border-t border-slate-300 mt-8 pt-4 text-center text-[10px] text-slate-400 font-mono">
            Generated with PassVault WebCrypto AES-256-GCM • PassVault does not retain a copy of your recovery key.
          </div>
        </div>
      </div>

      {/* ─── Screen Modal Dialog (Hidden on print) ─── */}
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0d1117] p-5 sm:p-7 text-white shadow-2xl my-auto print:hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 id="emergency-kit-title" className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Emergency Vault Recovery Kit
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                  Zero-Knowledge
                </span>
              </h2>
              <p className="text-xs text-[#8b949e]">
                Never get locked out if you forget your master password
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
            aria-label="Close modal"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-white/5 pt-3 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('kit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'kit'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            📄 Recovery Kit & Sheet
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('verify')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'verify'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            🔍 Test & Verify Words
          </button>
        </div>

        {/* Tab 1: Recovery Kit Preview & Actions */}
        {activeTab === 'kit' && (
          <div className="mt-4 space-y-4">
            {/* Security Warning Notice */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200/90 leading-relaxed flex items-start gap-2.5">
              <span className="text-base leading-none">⚠️</span>
              <div>
                <strong>Keep this sheet offline:</strong> Print or write down these 24 words and store them in a secure physical location (safe or deposit box). They are the <strong>only way</strong> to regain vault access if your master password is lost.
              </div>
            </div>

            {/* Account Metadata Row */}
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/5 bg-[#161b22] p-3 text-xs font-mono">
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase font-sans">Account Email</span>
                <span className="text-white font-semibold truncate block">{userEmail}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase font-sans">Account Salt / ID</span>
                <span className="text-white font-semibold truncate block">{vaultSalt || 'Active'}</span>
              </div>
            </div>

            {/* 24-Word Grid */}
            <div className="rounded-xl border border-white/10 bg-[#090d13] p-3.5">
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/5">
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  24-Word Cryptographic Emergency Key
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowWords(!showWords)}
                    className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 transition"
                  >
                    {showWords ? 'Hide Words' : 'Show Words'}
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateNewKey}
                    disabled={isGenerating}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 transition"
                  >
                    Regenerate
                  </button>
                </div>
              </div>

              {isGenerating ? (
                <div className="py-8 text-center text-xs text-zinc-400 animate-pulse">
                  Generating high-entropy 256-bit recovery key...
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 font-mono text-xs">
                  {recoveryKeyData?.words.map((word, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-white/5 bg-[#161b22] px-2 py-1.5 flex items-center justify-between text-zinc-300 select-all hover:border-emerald-500/30 transition"
                    >
                      <span className="text-zinc-500 text-[10px] select-none mr-1">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      <span className="font-semibold text-white">
                        {showWords ? word : '••••••'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Print & Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500 active:scale-95 transition flex items-center gap-1.5 shadow-md"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Print / Save PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyWords}
                  className="rounded-lg border border-white/10 bg-[#161b22] px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-[#1c2430] hover:text-white transition flex items-center gap-1.5"
                >
                  {copiedWords ? '✓ Copied!' : 'Copy 24 Words'}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="rounded-lg border border-white/10 bg-[#161b22] px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-[#1c2430] hover:text-white transition flex items-center gap-1.5"
                >
                  Download .txt
                </button>
              </div>

              {isSavedToBackend && (
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  ✓ Active on Vault
                </span>
              )}
            </div>

            {/* Server Registration / Activation Section */}
            {!isSavedToBackend && (
              <form
                onSubmit={handleSaveToVault}
                className="rounded-xl border border-white/10 bg-[#161b22] p-4 text-xs space-y-3 mt-3"
              >
                <div>
                  <h3 className="font-semibold text-white">Activate Rescue Key for This Vault</h3>
                  <p className="text-[#8b949e] text-[11px] mt-0.5">
                    Enter your master password once so PassVault can encrypt and store your emergency rescue payload in zero-knowledge mode.
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Enter current Master Password"
                    value={masterPasswordInput}
                    onChange={(e) => setMasterPasswordInput(e.target.value)}
                    className="flex-1 rounded-lg border border-white/10 bg-[#0d1117] px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-lg bg-emerald-600/80 px-4 py-2 font-bold text-white hover:bg-emerald-500 active:scale-95 disabled:opacity-50 transition"
                  >
                    {isSaving ? 'Activating...' : 'Activate Key'}
                  </button>
                </div>

                {saveError && (
                  <p className="text-rose-400 text-xs font-medium">{saveError}</p>
                )}
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Test & Verify Words */}
        {activeTab === 'verify' && (
          <div className="mt-4 space-y-4">
            <p className="text-xs text-[#8b949e]">
              Verify that the 24 words you printed or wrote down are mathematically sound and possess a valid BIP-39 SHA-256 checksum before archiving your physical sheet.
            </p>

            <form onSubmit={handleVerify} className="space-y-3">
              <textarea
                rows={4}
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                placeholder="Paste or type your 24 words separated by spaces..."
                className="w-full rounded-xl border border-white/10 bg-[#090d13] p-3 text-xs font-mono text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              />

              <div className="flex justify-between items-center">
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition"
                >
                  Verify Checksum
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVerifyInput(recoveryKeyData?.keyString || '');
                    setVerifyResult(null);
                  }}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Paste Active Generated Key
                </button>
              </div>
            </form>

            {verifyResult && (
              <div
                className={`rounded-xl border p-3 text-xs ${
                  verifyResult.valid
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                }`}
              >
                {verifyResult.message}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
