import { useState } from 'react';
import { exportToCSV, exportToEncryptedPassvault } from '../utils/vaultMigration';

export default function VaultExportModal({
  isOpen,
  onClose,
  credentials = [],
  vaultKey = null,
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  if (!isOpen) return null;

  const count = credentials.length;

  const handleExportPassvault = async () => {
    setStatusMessage(null);
    setIsExporting(true);
    try {
      if (!vaultKey) {
        throw new Error('Vault is locked. Unlock your vault before exporting an encrypted backup.');
      }
      await exportToEncryptedPassvault(credentials, vaultKey);
      setStatusMessage({
        type: 'success',
        text: `Successfully exported ${count} accounts to an encrypted .passvault backup!`,
      });
      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err) {
      console.error('Export error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to export encrypted backup',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    setStatusMessage(null);
    try {
      exportToCSV(credentials);
      setStatusMessage({
        type: 'success',
        text: `Successfully exported ${count} accounts to CSV spreadsheet!`,
      });
      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err) {
      console.error('CSV export error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to export CSV',
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#16161a] p-6 text-white shadow-2xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-inner">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div>
              <h2 id="export-modal-title" className="text-lg font-bold text-white tracking-tight">
                Export Vault Backup
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Download your credentials for offline recovery or migration
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close export dialog"
          >
            ✕
          </button>
        </div>

        {/* Account Count Badge */}
        <div className="my-4 flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-2.5 text-xs text-zinc-300">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Vault Status</span>
          </span>
          <span className="font-semibold text-white">
            {count} {count === 1 ? 'credential' : 'credentials'} ready to export
          </span>
        </div>

        {/* Status Alert Banner */}
        {statusMessage && (
          <div
            className={`mb-4 flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
              statusMessage.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300'
                : 'border-rose-500/30 bg-rose-950/40 text-rose-300'
            }`}
          >
            <span>{statusMessage.type === 'success' ? '✓' : '⚠️'}</span>
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Export Options Grid */}
        <div className="space-y-3">
          {/* Option 1: Encrypted .passvault */}
          <div className="group rounded-xl border border-cyan-500/20 bg-gradient-to-b from-cyan-950/20 to-transparent p-4 transition hover:border-cyan-500/40 hover:bg-cyan-950/30">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl leading-none">🛡️</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white">Encrypted Backup (.passvault)</span>
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      Recommended
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                    Zero-Knowledge AES-256-GCM encryption with 600k PBKDF2 iterations. Encrypted with your Master Password. Safe for cloud storage, USB, or drive backups.
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={isExporting || count === 0}
              onClick={handleExportPassvault}
              className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-cyan-500 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>{isExporting ? 'Encrypting & Downloading…' : 'Download Encrypted .passvault'}</span>
            </button>
          </div>

          {/* Option 2: Plain CSV */}
          <div className="group rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/20 hover:bg-white/[0.04]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl leading-none">📄</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white">Plaintext CSV (.csv)</span>
                    <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                      Unencrypted
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                    Standard RFC 4180 format with name, url, username, password, and notes. Compatible with Excel, Chrome, Bitwarden, or 1Password.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-2.5 rounded-lg border border-amber-500/20 bg-amber-950/20 px-2.5 py-1.5 text-[11px] text-amber-300">
              ⚠️ Warning: Passwords inside this file will be unencrypted. Store safely or delete after use.
            </div>
            <button
              type="button"
              disabled={isExporting || count === 0}
              onClick={handleExportCSV}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-white/10 hover:text-white active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download Plain CSV</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
