import { useState } from 'react';

/**
 * VaultSecurityAudit Component
 *
 * Provides a real-time, privacy-preserving cryptographic health audit of the vault:
 * - HaveIBeenPwned k-Anonymity breach detection
 * - Reused password detection across accounts
 * - Weak password entropy detection
 * - Consolidated Security Health Score (0-100%)
 */
export default function VaultSecurityAudit({
  auditData,
  onScanBreaches,
  isScanning,
  activeFilter,
  onSelectFilter,
  onFixPassword,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    score = 100,
    grade = 'Fortified',
    color = 'text-emerald-600',
    bgColor = 'bg-emerald-500',
    total = 0,
    breachedCount = 0,
    reusedCount = 0,
    weakCount = 0,
    reusedMap = {},
    totalBreachOccurrences = 0,
  } = auditData || {};

  const fortifiedCount = Math.max(0, total - breachedCount - reusedCount - weakCount);

  // SVG circular gauge calculation
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <section className="mb-8 overflow-hidden rounded-xl border border-[#ddd8d0] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] sm:p-6">
      {/* Header & Quick Summary */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        
        {/* Left: Circular Gauge & Health Level */}
        <div className="flex items-center gap-5">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 96 96">
              {/* Background track circle */}
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke="#ebe7e1"
                strokeWidth="7"
                fill="transparent"
              />
              {/* Animated Progress circle */}
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke="currentColor"
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className={`transition-all duration-700 ease-out ${color}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-['Space_Grotesk'] text-2xl font-bold tracking-tight text-[#1f2933]">
                {score}%
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7b746b]">
                Score
              </span>
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#f4f1ec] px-3 py-1 text-xs font-semibold text-[#1f2933]">
              <span className={`h-2 w-2 rounded-full ${bgColor} animate-pulse`}></span>
              <span>Vault Status: {grade}</span>
            </div>
            <h3 className="mt-1.5 font-['Space_Grotesk'] text-lg font-bold tracking-tight text-[#1f2933]">
              Cryptographic Vault Health
            </h3>
            <p className="text-xs text-[#7b746b]">
              {total === 0
                ? "No passwords saved yet. Add accounts to evaluate security."
                : breachedCount > 0
                ? `Alert: ${breachedCount} ${breachedCount === 1 ? 'account has' : 'accounts have'} appeared in known data breaches!`
                : reusedCount > 0
                ? "Warning: Some passwords are reused across multiple services."
                : "Excellent: Zero known breaches and high cryptographic entropy."}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onScanBreaches}
            disabled={isScanning || total === 0}
            className={`group inline-flex items-center gap-2 rounded-md border border-[#176b87]/30 bg-[#f0f8fa] px-4 py-2 text-xs font-semibold text-[#176b87] transition-all hover:border-[#176b87] hover:bg-[#176b87] hover:text-white active:scale-95 disabled:pointer-events-none disabled:opacity-50`}
          >
            <svg
              className={`h-4 w-4 ${isScanning ? 'animate-spin text-[#176b87] group-hover:text-white' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>{isScanning ? "Checking HIBP Breaches..." : "Scan for Data Breaches"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#d5d0c8] bg-white px-3.5 py-2 text-xs font-semibold text-[#4b5563] transition-all hover:bg-[#f4f1ec]"
          >
            <span>{isExpanded ? "Hide Details" : "View Vulnerabilities"}</span>
            <svg
              className={`h-3.5 w-3.5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Metric Filter Chips */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Breached Passwords */}
        <button
          type="button"
          onClick={() => onSelectFilter(activeFilter === 'breached' ? 'all' : 'breached')}
          className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all ${
            activeFilter === 'breached'
              ? 'border-rose-400 bg-rose-50 ring-2 ring-rose-200'
              : 'border-[#ddd8d0] bg-[#faf8f5] hover:border-rose-300'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
              <span className="h-2 w-2 rounded-full bg-rose-500"></span>
              <span>Breached</span>
            </div>
            <p className="mt-0.5 text-[11px] text-[#7b746b]">Leaked on web</p>
          </div>
          <span className="font-['Space_Grotesk'] text-lg font-bold text-rose-600">
            {breachedCount}
          </span>
        </button>

        {/* Reused Passwords */}
        <button
          type="button"
          onClick={() => onSelectFilter(activeFilter === 'reused' ? 'all' : 'reused')}
          className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all ${
            activeFilter === 'reused'
              ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-200'
              : 'border-[#ddd8d0] bg-[#faf8f5] hover:border-amber-300'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              <span>Reused</span>
            </div>
            <p className="mt-0.5 text-[11px] text-[#7b746b]">Duplicate keys</p>
          </div>
          <span className="font-['Space_Grotesk'] text-lg font-bold text-amber-600">
            {reusedCount}
          </span>
        </button>

        {/* Weak Passwords */}
        <button
          type="button"
          onClick={() => onSelectFilter(activeFilter === 'weak' ? 'all' : 'weak')}
          className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all ${
            activeFilter === 'weak'
              ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-200'
              : 'border-[#ddd8d0] bg-[#faf8f5] hover:border-orange-300'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-700">
              <span className="h-2 w-2 rounded-full bg-orange-500"></span>
              <span>Weak</span>
            </div>
            <p className="mt-0.5 text-[11px] text-[#7b746b]">&lt; 10 chars / simple</p>
          </div>
          <span className="font-['Space_Grotesk'] text-lg font-bold text-orange-600">
            {weakCount}
          </span>
        </button>

        {/* Fortified Passwords */}
        <button
          type="button"
          onClick={() => onSelectFilter('all')}
          className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all ${
            activeFilter === 'all'
              ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200'
              : 'border-[#ddd8d0] bg-[#faf8f5] hover:border-emerald-300'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>Fortified</span>
            </div>
            <p className="mt-0.5 text-[11px] text-[#7b746b]">High entropy</p>
          </div>
          <span className="font-['Space_Grotesk'] text-lg font-bold text-emerald-600">
            {fortifiedCount}
          </span>
        </button>
      </div>

      {/* Expanded Vulnerability Detail Drawer */}
      {isExpanded && (
        <div className="mt-6 border-t border-[#eee9e2] pt-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#1f2933]">
            Security Audit Details
          </h4>

          {breachedCount === 0 && reusedCount === 0 && weakCount === 0 ? (
            <div className="mt-3 rounded-md bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
              🎉 No vulnerabilities found! All passwords in your vault are distinct, strong, and uncompromised in public data breaches.
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {/* Breached section */}
              {breachedCount > 0 && (
                <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-800">
                      🚨 Leaked Passwords ({breachedCount} accounts)
                    </span>
                    <span className="text-[11px] text-rose-600">
                      Appeared {totalBreachOccurrences.toLocaleString()} times in known breaches
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-rose-700">
                    These passwords match entries found in real-world hacker databases. We strongly recommend changing them immediately.
                  </p>
                </div>
              )}

              {/* Reused section */}
              {reusedCount > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3.5">
                  <span className="text-xs font-bold text-amber-800">
                    🔁 Reused Passwords ({reusedCount} accounts)
                  </span>
                  <div className="mt-2 space-y-1.5 text-xs text-amber-900">
                    {Object.entries(reusedMap).map(([pwd, accounts], idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="font-mono text-amber-700">Identical password used on:</span>
                        {accounts.map(acc => (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => onFixPassword(acc.id)}
                            className="rounded bg-amber-200 px-1.5 py-0.5 font-semibold text-amber-900 hover:bg-amber-300"
                            title="Click to edit and generate new password"
                          >
                            {acc.site} ({acc.username}) ↗
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Weak section */}
              {weakCount > 0 && (
                <div className="rounded-lg border border-orange-200 bg-orange-50/60 p-3.5">
                  <span className="text-xs font-bold text-orange-800">
                    ⚠️ Weak Passwords ({weakCount} accounts)
                  </span>
                  <p className="mt-1 text-[11px] text-orange-700">
                    Passwords under 10 characters or lacking uppercase, numbers, and symbols are susceptible to brute-force attacks.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
