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
          icon: '🔓',
          color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        };
      case AUDIT_EVENT_TYPES.FAILED_PIN:
      case AUDIT_EVENT_TYPES.FAILED_MASTER:
        return {
          icon: '⚠️',
          color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        };
      case AUDIT_EVENT_TYPES.LOCKOUT_TRIGGERED:
        return {
          icon: '🚨',
          color: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        };
      case AUDIT_EVENT_TYPES.COPY_PASSWORD:
      case AUDIT_EVENT_TYPES.COPY_USERNAME:
        return {
          icon: '📋',
          color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
        };
      case AUDIT_EVENT_TYPES.EXPORT_VAULT:
        return {
          icon: '📦',
          color: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        };
      case AUDIT_EVENT_TYPES.IMPORT_VAULT:
        return {
          icon: '📥',
          color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
        };
      case AUDIT_EVENT_TYPES.LOCK_VAULT:
        return {
          icon: '🔒',
          color: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
        };
      case AUDIT_EVENT_TYPES.CREDENTIAL_CREATE:
        return {
          icon: '➕',
          color: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
        };
      case AUDIT_EVENT_TYPES.CREDENTIAL_UPDATE:
        return {
          icon: '✏️',
          color: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
        };
      case AUDIT_EVENT_TYPES.CREDENTIAL_DELETE:
        return {
          icon: '🗑️',
          color: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        };
      default:
        return {
          icon: 'ℹ️',
          color: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
        };
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-log-title"
    >
      <div
        className="relative flex w-full max-w-2xl max-h-[85vh] flex-col rounded-2xl border border-slate-700/80 bg-[#161f2c] text-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-[#1a2534]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/40 text-cyan-400 shadow-inner">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 id="audit-log-title" className="text-base font-bold text-white tracking-tight">
                Vault Security &amp; Access Audit Log
              </h2>
              <p className="text-xs text-slate-400">
                Tamper-evident chronological activity trail for <span className="font-mono text-slate-300">{userEmail}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            title="Close log"
            aria-label="Close modal"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-4 gap-2 border-b border-slate-800/80 bg-[#141b25] px-6 py-3 text-center text-xs">
          <div className="rounded-lg bg-slate-800/40 p-2">
            <div className="text-lg font-bold text-white">{stats.total}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Events</div>
          </div>
          <div className="rounded-lg bg-slate-800/40 p-2">
            <div className="text-lg font-bold text-emerald-400">{stats.unlocks}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Unlocks</div>
          </div>
          <div className="rounded-lg bg-slate-800/40 p-2">
            <div className="text-lg font-bold text-amber-400">{stats.failed}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Failed / Alerts</div>
          </div>
          <div className="rounded-lg bg-slate-800/40 p-2">
            <div className="text-lg font-bold text-cyan-400">{stats.copies}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Copies</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 border-b border-slate-800 px-6 py-2.5 bg-[#17212e] overflow-x-auto text-xs">
          {[
            { id: AUDIT_CATEGORIES.ALL, label: 'All Events' },
            { id: AUDIT_CATEGORIES.AUTH, label: 'Auth & Unlocks' },
            { id: AUDIT_CATEGORIES.CLIPBOARD, label: 'Clipboard' },
            { id: AUDIT_CATEGORIES.VAULT, label: 'Vault Actions' },
            { id: AUDIT_CATEGORIES.SECURITY, label: 'Alerts & Lockouts' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id)}
              className={`rounded-lg px-3 py-1 font-semibold transition-all whitespace-nowrap ${
                activeCategory === tab.id
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Event List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2.5 min-h-[260px]">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/70 text-slate-500 mb-3">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-300">No activity recorded yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Actions like unlocking the vault, copying credentials, and exports will appear here automatically.
              </p>
            </div>
          ) : (
            events.map((event) => {
              const badge = getEventBadge(event);
              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-[#1a232f]/60 p-3 transition hover:border-slate-700 hover:bg-[#1a232f]"
                >
                  <span
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border text-sm ${badge.color}`}
                    title={event.type}
                  >
                    {badge.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-200 truncate">
                        {event.title}
                      </span>
                      <span
                        className="text-[11px] font-mono text-slate-400 flex-shrink-0"
                        title={new Date(event.timestamp).toLocaleString()}
                      >
                        {formatAuditTime(event.timestamp)}
                      </span>
                    </div>
                    {event.description && (
                      <p className="mt-0.5 text-[11px] text-slate-400 leading-relaxed break-words">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-[#141b25] px-6 py-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportAuditLogJSON(userEmail)}
              disabled={events.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              title="Download audit events as JSON"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export JSON</span>
            </button>

            {confirmClear ? (
              <div className="inline-flex items-center gap-1.5">
                <span className="text-rose-400 text-[11px]">Clear all?</span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-500"
                >
                  Yes, Clear
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="rounded-lg bg-slate-800 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                disabled={events.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 px-3 py-1.5 text-slate-400 hover:border-rose-900/50 hover:bg-rose-950/30 hover:text-rose-300 transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Clear Log
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white px-4 py-1.5 font-bold text-slate-950 shadow hover:bg-slate-200 active:scale-95 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
