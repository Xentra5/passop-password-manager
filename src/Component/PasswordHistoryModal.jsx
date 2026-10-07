import { useState } from 'react';
import { toast } from 'react-toastify';
import SiteLogo from './SiteLogo';

export default function PasswordHistoryModal({
  isOpen,
  onClose,
  account,
  onRestorePassword,
  onClearHistory,
}) {
  const [revealedVersions, setRevealedVersions] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);

  if (!isOpen || !account) return null;

  const currentPassword = account.password || '';
  const history = account.history || [];

  const toggleReveal = (key) => {
    setRevealedVersions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Password copied to clipboard', { theme: 'dark', autoClose: 1600 });
    setTimeout(() => {
      setCopiedKey(prev => (prev === key ? null : prev));
    }, 1500);
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Previous version';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Previous version';
    }
  };

  const handleRestore = (historicalPassword) => {
    if (onRestorePassword) {
      onRestorePassword(account.id, historicalPassword);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f2933]/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-lg rounded-xl border border-[#ddd8d0] bg-white p-6 shadow-2xl transition-all sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#eee9e2] pb-4">
          <div className="flex items-center gap-3">
            <SiteLogo site={account.site} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-['Space_Grotesk'] text-lg font-bold text-[#1f2933]">
                  Password History
                </h3>
                <span className="rounded bg-[#f0f8fa] px-2 py-0.5 text-[11px] font-semibold text-[#176b87]">
                  {history.length} {history.length === 1 ? 'version' : 'versions'}
                </span>
              </div>
              <p className="text-xs text-[#7b746b]">
                {account.site} • {account.username}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[#aaa39a] hover:bg-[#f4f1ec] hover:text-[#1f2933]"
            title="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Current Active Password Card */}
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-800">
              🟢 Current Active Password
            </span>
            <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">
              Active Now
            </span>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-semibold text-emerald-950 truncate max-w-[280px]">
              {revealedVersions['current'] ? currentPassword : '••••••••••••••••'}
            </span>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => toggleReveal('current')}
                className="rounded p-1 text-emerald-700 hover:bg-emerald-100"
                title={revealedVersions['current'] ? 'Hide' : 'Reveal'}
              >
                {revealedVersions['current'] ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                onClick={() => copyToClipboard(currentPassword, 'current')}
                className="rounded p-1 text-emerald-700 hover:bg-emerald-100"
                title="Copy current password"
              >
                {copiedKey === 'current' ? (
                  <span className="text-xs font-bold text-emerald-600">✓</span>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Timeline of Previous Passwords */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-bold text-[#1f2933] uppercase tracking-wider mb-2">
            <span>Previous Passwords Timeline</span>
            {history.length > 0 && onClearHistory && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete the password history for this account?')) {
                    onClearHistory(account.id);
                  }
                }}
                className="text-[11px] font-semibold text-rose-600 hover:underline normal-case"
              >
                Clear History
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#d5d0c8] bg-[#faf9f7] py-8 text-center text-xs text-[#7b746b]">
              <p>No previous passwords recorded yet.</p>
              <p className="mt-1 text-[11px] text-[#aaa39a]">
                Whenever you edit and change this password, the previous version will be safely archived here.
              </p>
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
              {history.map((hist, index) => {
                const versionKey = `hist-${index}`;
                const isRevealed = Boolean(revealedVersions[versionKey]);
                const isCopied = copiedKey === versionKey;

                return (
                  <div
                    key={index}
                    className="flex flex-col gap-2 rounded-lg border border-[#e8e4de] bg-[#faf9f7] p-3 text-xs transition-all hover:border-[#176b87]/40 hover:bg-white"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#4b5563]">
                        Version {history.length - index}
                      </span>
                      <span className="text-[11px] text-[#7b746b]">
                        {formatDate(hist.changedAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-[#1f2933] truncate max-w-[240px]">
                        {isRevealed ? hist.password : '••••••••••••••••'}
                      </span>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleReveal(versionKey)}
                          className="rounded p-1 text-[#7b746b] hover:bg-[#ebe7e1]"
                          title={isRevealed ? 'Hide' : 'Reveal'}
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
                          onClick={() => copyToClipboard(hist.password, versionKey)}
                          className="rounded p-1 text-[#7b746b] hover:bg-[#ebe7e1]"
                          title="Copy previous password"
                        >
                          {isCopied ? (
                            <span className="text-xs font-bold text-emerald-600">✓</span>
                          ) : (
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRestore(hist.password)}
                          className="rounded bg-[#f0f8fa] px-2 py-0.5 text-[11px] font-semibold text-[#176b87] border border-[#176b87]/30 hover:bg-[#176b87] hover:text-white transition-all active:scale-95"
                          title="Restore this version as active password"
                        >
                          Restore
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-[#eee9e2] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#d5d0c8] px-4 py-2 text-xs font-semibold text-[#4b5563] hover:bg-[#f4f1ec]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
