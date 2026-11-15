import { useState, useEffect, useMemo } from 'react';
import {
  getAuditEvents,
  clearAuditEvents,
  exportAuditLogJSON,
  formatAuditTime,
  AUDIT_CATEGORIES,
  AUDIT_EVENT_TYPES,
} from '../utils/auditLogger';

export default function AuditLogModal({ isOpen, onClose, userEmail }) {
  const [activeCategory, setActiveCategory] = useState(AUDIT_CATEGORIES.ALL);
  const [confirmClear, setConfirmClear] = useState(false);
  const [auditVersion, setAuditVersion] = useState(0);

  const events = useMemo(() => {
    if (!isOpen) return [];
    void auditVersion;
    return getAuditEvents(userEmail, activeCategory);
  }, [isOpen, userEmail, activeCategory, auditVersion]);

  // Listen for live audit events while the modal is open
  useEffect(() => {
    if (!isOpen) return;
    const handleLiveEvent = () => setAuditVersion((prev) => prev + 1);
    window.addEventListener('passvault:audit_event', handleLiveEvent);
    return () => window.removeEventListener('passvault:audit_event', handleLiveEvent);
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const stats = useMemo(() => {
    void auditVersion;
    const all = getAuditEvents(userEmail, 'all');
    let unlocks = 0;
    let failed = 0;
    let copies = 0;
    for (const e of all) {
      if (e.type === AUDIT_EVENT_TYPES.UNLOCK_PIN || e.type === AUDIT_EVENT_TYPES.UNLOCK_MASTER) unlocks++;
      if (e.type === AUDIT_EVENT_TYPES.FAILED_PIN || e.type === AUDIT_EVENT_TYPES.FAILED_MASTER || e.type === AUDIT_EVENT_TYPES.LOCKOUT_TRIGGERED) failed++;
      if (e.type === AUDIT_EVENT_TYPES.COPY_PASSWORD || e.type === AUDIT_EVENT_TYPES.COPY_USERNAME) copies++;
    }
    return { total: all.length, unlocks, failed, copies };
  }, [userEmail, auditVersion]);

  if (!isOpen) return null;

  const handleClear = () => {
    clearAuditEvents(userEmail);
    setAuditVersion((prev) => prev + 1);
    setConfirmClear(false);
  };

  const getEventBadge = (event) => {
    switch (event.type) {
      case AUDIT_EVENT_TYPES.UNLOCK_PIN:
      case AUDIT_EVENT_TYPES.UNLOCK_MASTER:
        return {
          icon: (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          ),
          style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.12)]',
          badgeText: 'Auth',
        };
      case AUDIT_EVENT_TYPES.FAILED_PIN:
      case AUDIT_EVENT_TYPES.FAILED_MASTER:
        return {
          icon: (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
          style: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.12)]',
          badgeText: 'Failed',
        };
      case AUDIT_EVENT_TYPES.LOCKOUT_TRIGGERED:
        return {
          icon: (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          ),
          style: 'bg-rose-500/10 text-rose-400 border-rose-500/25 shadow-[0_0_12px_rgba(244,63,94,0.15)]',
          badgeText: 'Lockout',
        };
      case AUDIT_EVENT_TYPES.COPY_PASSWORD:
      case AUDIT_EVENT_TYPES.COPY_USERNAME:
        return {
          icon: (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          ),
          style: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
          badgeText: 'Clipboard',
        };
      case AUDIT_EVENT_TYPES.EXPORT_VAULT:
        return {
          icon: (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          ),
          style: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          badgeText: 'Export',
        };
      case AUDIT_EVENT_TYPES.IMPORT_VAULT:
        return {
          icon: (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          ),
          style: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          badgeText: 'Import',
        };
      case AUDIT_EVENT_TYPES.CREDENTIAL_CREATE:
      case AUDIT_EVENT_TYPES.CREDENTIAL_UPDATE:
        return {
          icon: (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          ),
          style: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
          badgeText: 'Vault',
        };
      case AUDIT_EVENT_TYPES.CREDENTIAL_DELETE:
        return {
          icon: (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          ),
          style: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          badgeText: 'Delete',
        };
      default:
        return {
          icon: (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          style: 'bg-zinc-800 text-zinc-400 border-zinc-700/50',
          badgeText: 'Event',
        };
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-6 backdrop-blur-xl animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-log-title"
    >
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute h-[450px] w-[550px] rounded-full bg-gradient-to-tr from-cyan-500/10 via-indigo-500/5 to-transparent blur-3xl" />

      {/* Main Glass Dialog */}
      <div
        className="relative flex w-full max-w-2xl max-h-[88vh] flex-col rounded-2xl border border-white/[0.08] bg-[#0c0d10]/95 text-zinc-100 shadow-[0_24px_70px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4 bg-gradient-to-b from-white/[0.02] to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-zinc-300 shadow-inner">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="audit-log-title" className="text-sm font-semibold text-white tracking-tight">
                  Security &amp; Access Ledger
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Audited user: <span className="font-mono text-zinc-300">{userEmail}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-xs text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
              title="Close (Esc)"
              aria-label="Close modal"
            >
              <kbd className="text-[10px] font-mono text-zinc-500">ESC</kbd>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Telemetry Strip - modern micro-metric chips */}
        <div className="flex items-center justify-between border-b border-white/[0.04] bg-white/[0.015] px-6 py-2.5 text-xs">
          <div className="flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
              <span>Total:</span>
              <span className="font-mono font-semibold text-zinc-200">{stats.total}</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Unlocks:</span>
              <span className="font-mono font-semibold text-emerald-400">{stats.unlocks}</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span>Alerts:</span>
              <span className="font-mono font-semibold text-amber-400">{stats.failed}</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              <span>Copies:</span>
              <span className="font-mono font-semibold text-sky-400">{stats.copies}</span>
            </div>
          </div>
          <span className="hidden sm:inline text-[10px] font-mono text-zinc-500">
            Retention: Last 100 events
          </span>
        </div>

        {/* Refined Segmented Control (Linear / Raycast Style) */}
        <div className="border-b border-white/[0.06] px-6 py-3 bg-[#0c0d10]">
          <div className="inline-flex w-full sm:w-auto items-center rounded-xl border border-white/[0.06] bg-white/[0.02] p-1 gap-1 text-xs overflow-x-auto">
            {[
              { id: AUDIT_CATEGORIES.ALL, label: 'All Activity' },
              { id: AUDIT_CATEGORIES.AUTH, label: 'Unlocks' },
              { id: AUDIT_CATEGORIES.CLIPBOARD, label: 'Clipboard' },
              { id: AUDIT_CATEGORIES.VAULT, label: 'Vault Data' },
              { id: AUDIT_CATEGORIES.SECURITY, label: 'Alerts & Lockouts' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={`rounded-lg px-3 py-1 font-medium transition-all whitespace-nowrap text-xs ${
                  activeCategory === tab.id
                    ? 'bg-white/[0.1] text-white shadow-xs border border-white/[0.08]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Event Stream Timeline */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2.5 min-h-[280px]">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] text-zinc-400 shadow-inner">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent" />
                <svg className="h-6 w-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-zinc-200">Security ledger is clear</h3>
              <p className="mt-1 text-xs text-zinc-500 max-w-sm leading-relaxed">
                Cryptographic unlocks, credential copies, and vault mutations will stream here automatically.
              </p>
            </div>
          ) : (
            <div className="relative space-y-2">
              {events.map((event) => {
                const badge = getEventBadge(event);
                return (
                  <div
                    key={event.id}
                    className="group relative flex items-start gap-3 rounded-xl border border-white/[0.05] bg-white/[0.015] p-3 transition-all hover:border-white/[0.1] hover:bg-white/[0.03]"
                  >
                    <div
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border text-xs ${badge.style}`}
                      title={event.type}
                    >
                      {badge.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-xs font-medium text-zinc-200">
                            {event.title}
                          </span>
                          <span className="rounded px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-zinc-400 bg-white/[0.04] border border-white/[0.05]">
                            {badge.badgeText}
                          </span>
                        </div>
                        <span
                          className="text-[10px] font-mono text-zinc-500 flex-shrink-0"
                          title={new Date(event.timestamp).toLocaleString()}
                        >
                          {formatAuditTime(event.timestamp)}
                        </span>
                      </div>
                      {event.description && (
                        <p className="mt-0.5 text-[11px] text-zinc-400 leading-relaxed break-words">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modern Minimal Footer */}
        <div className="flex items-center justify-between border-t border-white/[0.06] bg-[#0c0d10] px-6 py-3.5 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportAuditLogJSON(userEmail)}
              disabled={events.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 font-medium text-zinc-300 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              title="Download audit events as JSON"
            >
              <svg className="h-3.5 w-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export JSON</span>
            </button>

            {confirmClear ? (
              <div className="inline-flex items-center gap-1.5 animate-fadeIn">
                <span className="text-rose-400 text-[11px] font-medium">Purge ledger?</span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-lg bg-rose-500/20 border border-rose-500/30 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/30 transition"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="rounded-lg bg-white/[0.04] border border-white/[0.06] px-2 py-1 text-[11px] text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                disabled={events.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-zinc-500 hover:text-rose-400 transition disabled:opacity-30 disabled:cursor-not-allowed text-[11px]"
              >
                Clear Log
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/[0.1] bg-white/[0.06] px-4 py-1.5 font-medium text-xs text-zinc-200 hover:bg-white/[0.12] hover:text-white active:scale-95 transition shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
