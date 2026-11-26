import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getAuditEvents,
  clearAuditEvents,
  exportAuditLogJSON,
  formatAuditTime,
  logAuditEvent,
  AUDIT_CATEGORIES,
  AUDIT_EVENT_TYPES,
} from '../utils/auditLogger';

export default function AuditLogModal({ isOpen, onClose, userEmail }) {
  const [activeCategory, setActiveCategory] = useState(AUDIT_CATEGORIES.ALL);
  const [confirmClear, setConfirmClear] = useState(false);
  const [auditVersion, setAuditVersion] = useState(0);
  const [copiedEventId, setCopiedEventId] = useState(null);

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

  // All events query (re-computed whenever modal opens or auditVersion ticks)
  const allEvents = useMemo(() => {
    if (!isOpen) return [];
    void auditVersion;
    return getAuditEvents(userEmail, 'all');
  }, [isOpen, userEmail, auditVersion]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    if (activeCategory === AUDIT_CATEGORIES.ALL) return allEvents;
    return allEvents.filter((e) => e.category === activeCategory);
  }, [allEvents, activeCategory]);

  // High-signal telemetry statistics
  const stats = useMemo(() => {
    let unlocks = 0;
    let failed = 0;
    let copies = 0;
    let authCount = 0;
    let clipboardCount = 0;
    let vaultCount = 0;
    let securityCount = 0;

    for (const e of allEvents) {
      if (e.category === AUDIT_CATEGORIES.AUTH) authCount++;
      if (e.category === AUDIT_CATEGORIES.CLIPBOARD) clipboardCount++;
      if (e.category === AUDIT_CATEGORIES.VAULT) vaultCount++;
      if (e.category === AUDIT_CATEGORIES.SECURITY) securityCount++;

      if (e.type === AUDIT_EVENT_TYPES.UNLOCK_PIN || e.type === AUDIT_EVENT_TYPES.UNLOCK_MASTER) unlocks++;
      if (
        e.type === AUDIT_EVENT_TYPES.FAILED_PIN ||
        e.type === AUDIT_EVENT_TYPES.FAILED_MASTER ||
        e.type === AUDIT_EVENT_TYPES.LOCKOUT_TRIGGERED
      ) {
        failed++;
      }
      if (e.type === AUDIT_EVENT_TYPES.COPY_PASSWORD || e.type === AUDIT_EVENT_TYPES.COPY_USERNAME) copies++;
    }

    return {
      total: allEvents.length,
      unlocks,
      failed,
      copies,
      counts: {
        [AUDIT_CATEGORIES.ALL]: allEvents.length,
        [AUDIT_CATEGORIES.AUTH]: authCount,
        [AUDIT_CATEGORIES.CLIPBOARD]: clipboardCount,
        [AUDIT_CATEGORIES.VAULT]: vaultCount,
        [AUDIT_CATEGORIES.SECURITY]: securityCount,
      },
    };
  }, [allEvents]);

  // High-performance spotlight coordinate tracker
  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
  }, []);

  // Quick test action so user can immediately observe the ledger in action
  const handleSimulateTestEvent = () => {
    logAuditEvent(userEmail, {
      type: AUDIT_EVENT_TYPES.UNLOCK_PIN,
      title: 'Vault Unlocked via Quick PIN',
      description: 'Zero-knowledge hardware entropy verification passed.',
      severity: 'success',
      category: AUDIT_CATEGORIES.AUTH,
      metadata: { method: 'pin_sha256', client: 'web' },
    });
  };

  const handleClear = () => {
    clearAuditEvents(userEmail);
    setAuditVersion((prev) => prev + 1);
    setConfirmClear(false);
  };

  const handleCopyEventJSON = (event) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(event, null, 2));
      setCopiedEventId(event.id);
      setTimeout(() => setCopiedEventId(null), 1800);
    } catch {
      // Fallback silent
    }
  };

  if (!isOpen) return null;

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
          accentBorder: 'bg-emerald-500',
          style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.18)]',
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
          accentBorder: 'bg-amber-500',
          style: 'bg-amber-500/10 text-amber-400 border-amber-500/25 shadow-[0_0_12px_rgba(245,158,11,0.18)]',
          badgeText: 'Failed',
        };
      case AUDIT_EVENT_TYPES.LOCKOUT_TRIGGERED:
        return {
          icon: (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          ),
          accentBorder: 'bg-rose-500',
          style: 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_14px_rgba(244,63,94,0.22)]',
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
          accentBorder: 'bg-sky-500',
          style: 'bg-sky-500/10 text-sky-400 border-sky-500/25 shadow-[0_0_10px_rgba(56,189,248,0.15)]',
          badgeText: 'Clipboard',
        };
      case AUDIT_EVENT_TYPES.EXPORT_VAULT:
        return {
          icon: (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          ),
          accentBorder: 'bg-purple-500',
          style: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
          badgeText: 'Export',
        };
      case AUDIT_EVENT_TYPES.IMPORT_VAULT:
        return {
          icon: (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          ),
          accentBorder: 'bg-indigo-500',
          style: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25',
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
          accentBorder: 'bg-teal-500',
          style: 'bg-teal-500/10 text-teal-400 border-teal-500/25',
          badgeText: 'Vault',
        };
      case AUDIT_EVENT_TYPES.CREDENTIAL_RESTORE:
        return {
          icon: (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          ),
          accentBorder: 'bg-emerald-500',
          style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
          badgeText: 'Restored',
        };
      case AUDIT_EVENT_TYPES.CREDENTIAL_TRASH:
        return {
          icon: (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          ),
          accentBorder: 'bg-amber-500',
          style: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
          badgeText: 'Trashed',
        };
      case AUDIT_EVENT_TYPES.CREDENTIAL_DELETE:
        return {
          icon: (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          ),
          accentBorder: 'bg-rose-500',
          style: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
          badgeText: 'Delete',
        };
      default:
        return {
          icon: (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          accentBorder: 'bg-zinc-600',
          style: 'bg-zinc-800 text-zinc-400 border-zinc-700/50',
          badgeText: 'Event',
        };
    }
  };

  const tabs = [
    { id: AUDIT_CATEGORIES.ALL, label: 'All Activity', count: stats.counts[AUDIT_CATEGORIES.ALL] },
    { id: AUDIT_CATEGORIES.AUTH, label: 'Unlocks', count: stats.counts[AUDIT_CATEGORIES.AUTH] },
    { id: AUDIT_CATEGORIES.CLIPBOARD, label: 'Clipboard', count: stats.counts[AUDIT_CATEGORIES.CLIPBOARD] },
    { id: AUDIT_CATEGORIES.VAULT, label: 'Vault Data', count: stats.counts[AUDIT_CATEGORIES.VAULT] },
    { id: AUDIT_CATEGORIES.SECURITY, label: 'Alerts', count: stats.counts[AUDIT_CATEGORIES.SECURITY] },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 sm:p-6 animate-audit-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-log-title"
    >
      {/* Ambient Radial Bloom */}
      <div className="pointer-events-none absolute h-[500px] w-[600px] rounded-full bg-gradient-to-tr from-cyan-500/10 via-sky-500/5 to-transparent blur-3xl opacity-70" />

      {/* Main Obsidian Modal Shell */}
      <div
        onMouseMove={handleMouseMove}
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-2xl max-h-[88vh] flex-col rounded-2xl border border-white/[0.08] text-zinc-100 shadow-[0_24px_70px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.12)] overflow-hidden animate-audit-modal"
        style={{
          background:
            'radial-gradient(650px circle at var(--spot-x, 50%) var(--spot-y, 25%), rgba(255, 255, 255, 0.035), transparent 75%), #090a0d',
        }}
      >
        {/* Subtle Top Inset Sheen Line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* 1. Header Bar */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4 bg-gradient-to-b from-white/[0.02] to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-zinc-300 shadow-inner">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="audit-log-title" className="text-sm font-semibold text-white tracking-tight">
                  Security &amp; Access Ledger
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Audited principal: <span className="font-mono text-zinc-300">{userEmail}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-xs text-zinc-400 transition hover:bg-white/[0.08] hover:text-white active:scale-95"
            title="Close (Esc)"
            aria-label="Close modal"
          >
            <kbd className="text-[10px] font-mono text-zinc-500">ESC</kbd>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 2. Sleek Telemetry Ribbon (Linear / Stripe status bar) */}
        <div className="flex flex-wrap items-center justify-between border-b border-white/[0.04] bg-white/[0.015] px-6 py-2.5 text-xs gap-3">
          <div className="flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400">Total Operations:</span>
              <span className="font-mono font-semibold text-zinc-200 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
                {stats.total}
              </span>
            </div>
            <div className="h-3 w-px bg-white/[0.08]" />
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
              <span className="text-zinc-400">Unlocks:</span>
              <span className="font-mono font-semibold text-emerald-400">{stats.unlocks}</span>
            </div>
            <div className="h-3 w-px bg-white/[0.08]" />
            <div className="flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  stats.failed > 0 ? 'bg-amber-400 animate-ping' : 'bg-zinc-600'
                }`}
              />
              <span className="text-zinc-400">Alerts:</span>
              <span className={`font-mono font-semibold ${stats.failed > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                {stats.failed}
              </span>
            </div>
            <div className="h-3 w-px bg-white/[0.08]" />
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
              <span className="text-zinc-400">Copies:</span>
              <span className="font-mono font-semibold text-sky-400">{stats.copies}</span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
            <svg className="h-3 w-3 text-emerald-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>SHA-256 Tamper-Evident</span>
          </div>
        </div>

        {/* 3. Tactile Segmented Control Pill Bar */}
        <div className="border-b border-white/[0.06] px-6 py-2.5 bg-[#090a0d]/60">
          <div className="inline-flex w-full sm:w-auto items-center rounded-xl border border-white/[0.06] bg-white/[0.02] p-1 gap-1 text-xs overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id)}
                  className={`relative rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 active:scale-[0.97] flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'bg-gradient-to-b from-white/[0.14] to-white/[0.06] text-white shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.18)] border border-white/[0.12]'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] border border-transparent'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] font-mono px-1 rounded transition-colors ${
                      isActive ? 'bg-white/20 text-white font-semibold' : 'text-zinc-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Timeline Event Stream or High-Tech Cryptographic Sonar Radar */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 min-h-[300px]">
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              {/* Animated Cryptographic Radar */}
              <div className="relative mb-5 flex h-24 w-24 items-center justify-center">
                {/* Concentric Sonar Rings */}
                <div className="absolute inset-0 rounded-full border border-sky-500/20 animate-radar-pulse" />
                <div className="absolute inset-3 rounded-full border border-sky-500/25" />
                <div className="absolute inset-6 rounded-full border border-sky-500/35" />

                {/* Sweeping Conic Beam */}
                <div
                  className="absolute inset-0 rounded-full animate-radar-sweep pointer-events-none opacity-40"
                  style={{
                    background:
                      'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(56, 189, 248, 0.45) 360deg)',
                  }}
                />

                {/* Center Core Node */}
                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-sky-400/30 bg-[#0d1117] shadow-[0_0_20px_rgba(56,189,248,0.3)]">
                  <svg className="h-5 w-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-mono tracking-wider uppercase text-sky-400 mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                Sentinel Stream Active
              </div>

              <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">Security Ledger is Clear</h3>
              <p className="mt-1 text-xs text-zinc-400 max-w-sm leading-relaxed">
                {activeCategory === AUDIT_CATEGORIES.ALL
                  ? 'All cryptographic unlocks, clipboard interactions, and vault mutations stream to this tamper-evident log automatically.'
                  : `No recorded activity matches the "${activeCategory}" filter.`}
              </p>

              {/* Simulation button so user can test the ledger immediately! */}
              <button
                type="button"
                onClick={handleSimulateTestEvent}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.08] hover:text-white transition active:scale-95 shadow-sm"
              >
                <svg className="h-3.5 w-3.5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Simulate Test Audit Event</span>
              </button>
            </div>
          ) : (
            <div className="relative space-y-2">
              {filteredEvents.map((event, index) => {
                const badge = getEventBadge(event);
                const isCopied = copiedEventId === event.id;
                return (
                  <div
                    key={event.id}
                    style={{
                      animation: 'audit-row-enter 0.28s cubic-bezier(0.16, 1, 0.3, 1) both',
                      animationDelay: `${Math.min(index * 28, 280)}ms`,
                    }}
                    className="group relative flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3 transition-all duration-200 hover:border-white/[0.14] hover:bg-white/[0.035] hover:-translate-y-0.5 overflow-hidden"
                  >
                    {/* Subtle Left Severity Indicator Bar */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-0.5 ${badge.accentBorder} opacity-60 group-hover:opacity-100 transition-opacity`}
                    />

                    {/* Category Icon Badge */}
                    <div
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border text-xs ml-1 ${badge.style}`}
                      title={event.type}
                    >
                      {badge.icon}
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-xs font-medium text-zinc-200 group-hover:text-white transition-colors">
                            {event.title}
                          </span>
                          <span className="rounded px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-zinc-400 bg-white/[0.04] border border-white/[0.05]">
                            {badge.badgeText}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Copy event JSON button on hover */}
                          <button
                            type="button"
                            onClick={() => handleCopyEventJSON(event)}
                            className="opacity-0 group-hover:opacity-100 text-[10px] text-zinc-400 hover:text-white px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.03] transition-all"
                            title="Copy event payload"
                          >
                            {isCopied ? 'Copied!' : 'JSON'}
                          </button>
                          <span
                            className="text-[10px] font-mono text-zinc-500"
                            title={new Date(event.timestamp).toLocaleString()}
                          >
                            {formatAuditTime(event.timestamp)}
                          </span>
                        </div>
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

        {/* 5. Bottom Action Bar */}
        <div className="flex items-center justify-between border-t border-white/[0.06] bg-[#090a0d] px-6 py-3.5 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportAuditLogJSON(userEmail)}
              disabled={allEvents.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 font-medium text-zinc-300 transition hover:bg-white/[0.06] hover:text-white active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
              title="Download audit ledger as encrypted JSON"
            >
              <svg className="h-3.5 w-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export JSON</span>
            </button>

            {confirmClear ? (
              <div className="inline-flex items-center gap-1.5 animate-audit-modal">
                <span className="text-rose-400 text-[11px] font-medium">Purge ledger?</span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-lg bg-rose-500/20 border border-rose-500/30 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/30 transition active:scale-95"
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
                disabled={allEvents.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-zinc-500 hover:text-rose-400 transition disabled:opacity-30 disabled:cursor-not-allowed text-[11px]"
              >
                Clear Ledger
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/[0.12] bg-gradient-to-b from-white/[0.09] to-white/[0.04] px-4 py-1.5 font-medium text-xs text-zinc-200 hover:border-white/[0.22] hover:text-white active:scale-95 transition shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.12)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
