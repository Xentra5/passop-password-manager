import { useState, useEffect, useRef } from 'react';
import { toast, Bounce } from 'react-toastify';
import {
  verifyUserPin,
  saveUserPin,
  hasUserPin,
  getAutoLockTimeoutMinutes,
  setAutoLockTimeoutMinutes,
} from '../utils/pinAuth';
import {
  logAuditEvent,
  AUDIT_CATEGORIES,
  AUDIT_EVENT_TYPES,
} from '../utils/auditLogger';

/**
 * SECURITY FIXES APPLIED:
 * - BUG #4 FIX: verifyUserPin now returns { valid, locked, remainingAttempts, secondsLeft }.
 *   The UI surfaces remaining attempts, shows a lockout countdown timer, and
 *   disables the keypad during the lockout period.
 * - BUG #12 FIX: The hidden keyboard <input> also respects the lockout — it
 *   checks the return value from verifyUserPin and displays the same lockout UI.
 * - BUG #13 FIX (in App.jsx): onUnlockWithMasterPassword is now passed from App.jsx.
 *   Here we ensure that if it IS undefined, we throw an error rather than silently
 *   unlocking the vault.
 */
export default function LockScreenModal({
  isOpen,
  user,
  hasVaultKey = false,
  onUnlock,
  onLogout,
  onUnlockWithMasterPassword,
  onTimeoutChange,
}) {
  const [pin, setPin] = useState('');
  const [hasExistingPin, setHasExistingPin] = useState(false);
  const [isSettingUpPin, setIsSettingUpPin] = useState(false);
  const [confirmPin, setConfirmPin] = useState('');
  const [shake, setShake] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [masterPasswordError, setMasterPasswordError] = useState('');
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [usePasswordMode, setUsePasswordMode] = useState(false);
  const [timeoutSetting, setTimeoutSetting] = useState(5);
  const [showSettings, setShowSettings] = useState(false);
  // BUG #4 FIX: track lockout state for UI feedback
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [lockoutCycle, setLockoutCycle] = useState(0); // escalation tier
  // Master password brute force protection (frontend-only, in-memory)
  const [mpFailedAttempts, setMpFailedAttempts] = useState(0);
  const [mpLockoutSeconds, setMpLockoutSeconds] = useState(0);
  const mpLockoutTiers = [5, 30, 120, 600]; // 5s → 30s → 2min → 10min
  const mpLockoutTimerRef = useRef(null);
  const lockoutTimerRef = useRef(null);
  const inputRef = useRef(null);
  const masterPasswordInputRef = useRef(null);
  const pinVerificationInFlightRef = useRef(false);

  const userEmail = user?.email || 'user';

  // Countdown tick for lockout display
  useEffect(() => {
    if (lockoutSeconds > 0) {
      lockoutTimerRef.current = setTimeout(() => setLockoutSeconds(s => s - 1), 1000);
    }
    return () => clearTimeout(lockoutTimerRef.current);
  }, [lockoutSeconds]);

  // Countdown tick for master password lockout
  useEffect(() => {
    if (mpLockoutSeconds > 0) {
      mpLockoutTimerRef.current = setTimeout(() => setMpLockoutSeconds(s => s - 1), 1000);
    }
    return () => clearTimeout(mpLockoutTimerRef.current);
  }, [mpLockoutSeconds]);

  // Check if PIN is configured whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const pinExists = hasUserPin(userEmail);
        setHasExistingPin(pinExists);
        // A missing PIN must not block access to the master-password flow.
        // PIN setup is optional and can be started from that flow.
        setIsSettingUpPin(false);
        setPin('');
        setConfirmPin('');
        setMasterPassword('');
        setMasterPasswordError('');
        setIsUnlocking(false);
        setUsePasswordMode(!hasVaultKey);
        setLockoutSeconds(0);
        setRemainingAttempts(5);
        setMpFailedAttempts(0);
        setMpLockoutSeconds(0);
        setLockoutCycle(0);
        setTimeoutSetting(getAutoLockTimeoutMinutes());
        // Keep Chrome's password manager away from the hidden PIN field. Focus
        // the visible master-password field when the vault key is unavailable.
        if (hasVaultKey) inputRef.current?.focus();
        else masterPasswordInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [hasVaultKey, isOpen, userEmail]);

  if (!isOpen) return null;

  const triggerErrorShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 450);
    setPin('');
  };

  // BUG #4 + #12 FIX: Shared PIN verification handler — reads lockout from pinAuth
  const handlePinVerification = async (enteredPin) => {
    // A PIN cannot recreate the encryption key after refresh; only allow PIN
    // unlock while the current vault key is still held in memory.
    if (!hasVaultKey) return;
    // Don't allow attempts during lockout
    if (lockoutSeconds > 0 || enteredPin.length !== 4 || pinVerificationInFlightRef.current) return;
    pinVerificationInFlightRef.current = true;

    try {
      const result = await verifyUserPin(enteredPin, userEmail);

      if (result.valid) {
        setLockoutSeconds(0);
        logAuditEvent(userEmail, {
          type: AUDIT_EVENT_TYPES.UNLOCK_PIN,
          title: 'Vault Unlocked via PIN',
          description: '4-digit Quick PIN entered successfully.',
          severity: 'success',
          category: AUDIT_CATEGORIES.AUTH,
        });
        toast.success('Vault unlocked!', {
          theme: 'dark',
          transition: Bounce,
          autoClose: 1500,
        });
        onUnlock();
      } else if (result.locked) {
        setLockoutSeconds(result.secondsLeft || 30);
        setLockoutCycle(result.cycle || 1);
        setRemainingAttempts(0);
        logAuditEvent(userEmail, {
          type: AUDIT_EVENT_TYPES.LOCKOUT_TRIGGERED,
          title: 'Keypad Lockout Enforced',
          description: `Too many wrong PIN attempts. Keypad locked for ${result.secondsLeft || 30}s (tier #${result.cycle || 1}).`,
          severity: 'danger',
          category: AUDIT_CATEGORIES.SECURITY,
        });
        toast.error(
          `🔒 Too many wrong attempts. Locked for ${result.secondsLeft || 30}s.`,
          { theme: 'dark', autoClose: 4000 }
        );
        triggerErrorShake();
      } else {
        setRemainingAttempts(result.remainingAttempts ?? 5);
        logAuditEvent(userEmail, {
          type: AUDIT_EVENT_TYPES.FAILED_PIN,
          title: 'Incorrect PIN Attempt',
          description: `Failed PIN attempt entered. ${result.remainingAttempts} attempt(s) remaining.`,
          severity: 'warning',
          category: AUDIT_CATEGORIES.SECURITY,
        });
        toast.error(
          `Incorrect PIN. ${result.remainingAttempts} attempt${result.remainingAttempts !== 1 ? 's' : ''} remaining.`,
          { theme: 'dark', autoClose: 1800 }
        );
        triggerErrorShake();
      }
    } finally {
      pinVerificationInFlightRef.current = false;
    }
  };

  const handleKeypadPress = async (digit) => {
    if (lockoutSeconds > 0 || pin.length >= 4) return;
    const nextPin = pin + digit;
    setPin(nextPin);

    if (nextPin.length === 4) {
      if (isSettingUpPin) return; // Step 1 of PIN setup — wait for confirm
      await handlePinVerification(nextPin);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleSaveNewPin = async (e) => {
    e.preventDefault();
    if (pin.length !== 4) {
      toast.warn('PIN must be 4 digits', { theme: 'dark' });
      return;
    }
    if (pin !== confirmPin) {
      toast.error('PINs do not match', { theme: 'dark' });
      triggerErrorShake();
      setConfirmPin('');
      return;
    }

    try {
      await saveUserPin(pin, userEmail);
      toast.success('4-Digit Quick PIN configured!', { theme: 'dark', autoClose: 1800 });
      setHasExistingPin(true);
      setIsSettingUpPin(false);
      onUnlock();
    } catch (err) {
      toast.error(err.message || 'Failed to save PIN', { theme: 'dark' });
    }
  };

  const handleMasterPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!masterPassword || isUnlocking) return;

    // Master password brute force protection
    if (mpLockoutSeconds > 0) {
      toast.error(`🔒 Too many failed attempts. Try again in ${mpLockoutSeconds}s.`, { theme: 'dark', autoClose: 3000 });
      return;
    }

    if (masterPassword.length < 12) {
      const msg = masterPassword.length <= 4
        ? 'Please enter your full account Master Password (at least 12 characters), not your 4-digit PIN. After a browser refresh, the full password is required to derive your vault encryption key.'
        : 'Master password must be at least 12 characters.';
      setMasterPasswordError(msg);
      triggerErrorShake();
      return;
    }

    setIsUnlocking(true);
    setMasterPasswordError('');
    try {
      // BUG #13 FIX: Guard against undefined callback — it MUST be provided by App.jsx
      if (!onUnlockWithMasterPassword) {
        throw new Error('Master password verification is not available. Please log out and log in again.');
      }
      await onUnlockWithMasterPassword(masterPassword);
      // Success — reset MP failure counter
      setMpFailedAttempts(0);
      setMpLockoutSeconds(0);
      logAuditEvent(userEmail, {
        type: AUDIT_EVENT_TYPES.UNLOCK_MASTER,
        title: 'Vault Unlocked via Master Password',
        description: 'Account master password entered and verified.',
        severity: 'success',
        category: AUDIT_CATEGORIES.AUTH,
      });
      onUnlock();
    } catch (err) {
      const message = err.message || 'Could not unlock the vault. Please try again.';
      setMasterPasswordError(message);
      toast.error(message, { theme: 'dark' });
      triggerErrorShake();

      logAuditEvent(userEmail, {
        type: AUDIT_EVENT_TYPES.FAILED_MASTER,
        title: 'Failed Master Password Unlock',
        description: 'Incorrect master password entered.',
        severity: 'danger',
        category: AUDIT_CATEGORIES.SECURITY,
      });

      // Increment MP failure counter and enforce escalating lockout
      setMpFailedAttempts(prev => {
        const next = prev + 1;
        const MAX_MP = 5;
        if (next >= MAX_MP) {
          const tierIdx = Math.min(Math.floor(next / MAX_MP) - 1, mpLockoutTiers.length - 1);
          const lockSecs = mpLockoutTiers[tierIdx];
          setMpLockoutSeconds(lockSecs);
          toast.error(`🔒 Too many wrong attempts! Locked for ${lockSecs}s.`, { theme: 'dark', autoClose: 5000 });
        }
        return next;
      });
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleTimeoutChange = (minutes) => {
    setAutoLockTimeoutMinutes(minutes);
    setTimeoutSetting(minutes);
    onTimeoutChange?.(minutes);
    toast.info(`Auto-lock set to ${minutes === 0 ? 'Never' : `${minutes} minutes`}`, {
      theme: 'dark',
      autoClose: 1500,
    });
  };

  const isLockedOut = lockoutSeconds > 0;

  return (
    <div className="lock-screen-overlay fixed inset-0 z-50 flex items-center justify-center bg-[#0b1016]/80 p-4 backdrop-blur-md animate-fadeIn" role="dialog" aria-modal="true" aria-labelledby="lock-screen-title">
      {/* Keyboard PIN input — respects lockout via handlePinVerification */}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={pin}
        disabled={isLockedOut}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="done"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (!isSettingUpPin) {
              void handlePinVerification(pin);
            }
          }
        }}
        onChange={(e) => {
          if (isLockedOut) return;
          const val = e.target.value.replace(/\D/g, '');
          if (val.length <= 4) {
            setPin(val);
            if (val.length === 4 && !isSettingUpPin) {
              handlePinVerification(val);
            }
          }
        }}
        className="sr-only"
        aria-label="Four digit vault PIN"
      />

      <div
        className={`lock-screen-card relative w-full max-w-sm rounded-2xl border border-[#303846] bg-[#1a232e] p-6 shadow-2xl text-white transition-all ${
          shake ? 'animate-shake ring-2 ring-rose-500/50' : ''
        }`}
      >
        {/* Top Lock Icon & Header */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#2b3949] bg-[#222d3b] text-slate-300 shadow-inner">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-slate-400"></div>
          </div>

          <h3 id="lock-screen-title" className="font-['Space_Grotesk'] text-xl font-bold tracking-tight text-white">
            Vault Locked
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {userEmail}
          </p>
        </div>

        {/* PIN Lockout Banner — escalating tier display */}
        {isLockedOut && (
          <div className="mt-4 rounded-lg border border-rose-700 bg-rose-900/40 px-4 py-3 text-center text-xs text-rose-300">
            🔒 Too many wrong attempts.<br />
            <span className="font-bold text-rose-200">Try again in {lockoutSeconds}s</span>
            {lockoutCycle > 1 && (
              <span className="ml-1 text-rose-400 text-[10px]">(lockout #{lockoutCycle} — increasing each time)</span>
            )}
          </div>
        )}

        {/* PIN MODE: Normal Unlock with Existing PIN */}
        {!usePasswordMode && !isSettingUpPin && (
          <div className="mt-6 flex flex-col items-center">
            {/* 4-Dot Indicator */}
            <div className="flex items-center gap-4 py-2">
              {[0, 1, 2, 3].map((idx) => {
                const filled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`lock-pin-slot h-4 w-4 rounded-md border-2 transition-all duration-200 ${
                      filled
                        ? 'border-slate-200 bg-slate-200 scale-110 shadow-[0_0_10px_rgba(226,232,240,0.35)]'
                        : 'border-slate-600 bg-transparent'
                    }`}
                  />
                );
              })}
            </div>

            {/* BUG #4 FIX: Show remaining attempts (when not locked out) */}
            {!isLockedOut && remainingAttempts < 5 && (
              <p className="mt-1 text-[11px] text-rose-400 font-semibold">
                {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining before lockout
              </p>
            )}

            <p className="mt-2 text-[11px] text-slate-400">
              {isLockedOut ? 'Keypad disabled during lockout' : 'Enter 4-digit PIN (type on keyboard or tap below)'}
            </p>

            {/* Numeric Keypad */}
            <div className="mt-5 grid grid-cols-3 gap-2.5 w-full max-w-60">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(String(num))}
                  disabled={isLockedOut}
                  className="flex h-12 items-center justify-center rounded-xl border border-slate-700/60 bg-[#222d3b]/80 font-mono text-lg font-semibold text-white shadow-sm transition-all hover:border-slate-500 hover:bg-[#2c394a] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {num}
                </button>
              ))}
              <div className="flex items-center justify-center text-xs text-slate-500">
                PIN
              </div>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                disabled={isLockedOut}
                className="flex h-12 items-center justify-center rounded-xl border border-slate-700/60 bg-[#222d3b]/80 font-mono text-lg font-semibold text-white shadow-sm transition-all hover:border-slate-500 hover:bg-[#2c394a] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                disabled={isLockedOut}
                className="flex h-12 items-center justify-center rounded-xl border border-slate-700/60 bg-[#222d3b]/80 text-slate-400 transition-all hover:border-slate-500 hover:text-white active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Backspace"
              >
                ⌫
              </button>
            </div>

            {/* Alternative Unlock & Settings Links */}
            <div className="mt-6 flex flex-col items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setUsePasswordMode(true)}
                className="text-slate-200 hover:underline"
              >
                Unlock with Master Password instead
              </button>

              <button
                type="button"
                onClick={() => { setUsePasswordMode(false); setIsSettingUpPin(true); setPin(''); setConfirmPin(''); }}
                className="text-slate-400 hover:text-slate-200"
              >
                {hasExistingPin ? 'Change 4-Digit PIN' : 'Set up a 4-Digit Quick PIN'}
              </button>
            </div>
          </div>
        )}

        {/* PIN MODE: Setup New PIN */}
        {isSettingUpPin && !usePasswordMode && (
          <form onSubmit={handleSaveNewPin} className="mt-5 space-y-4">
            <div className="rounded-lg bg-[#222d3b] p-3 text-xs text-slate-300">
              💡 {hasExistingPin ? 'Change your Quick PIN' : 'Set up a 4-Digit Quick PIN to unlock in 1 second without typing your full password every time.'}
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300">Choose 4-Digit PIN</label>
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="4 digits (e.g. 1234)"
                className="mt-1 w-full rounded-md border border-slate-700 bg-[#141b22] px-3 py-2 text-center font-mono text-sm tracking-widest text-white focus:border-slate-300 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300">Confirm 4-Digit PIN</label>
              <input
                type="password"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Confirm digits"
                className="mt-1 w-full rounded-md border border-slate-700 bg-[#141b22] px-3 py-2 text-center font-mono text-sm tracking-widest text-white focus:border-slate-300 focus:outline-none"
                required
              />
            </div>

            <div className="flex gap-2">
              {(hasExistingPin || hasVaultKey) && (
                <button
                  type="button"
                  onClick={() => { setIsSettingUpPin(false); setUsePasswordMode(true); setPin(''); setConfirmPin(''); }}
                  className="w-1/2 rounded-md border border-slate-700 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="w-full rounded-md bg-white py-2 text-xs font-bold text-black shadow transition-all hover:bg-slate-200 active:scale-95"
              >
                Save PIN & Unlock
              </button>
            </div>
          </form>
        )}

        {/* PASSWORD MODE: Unlock with Full Master Password */}
        {usePasswordMode && (
          <form onSubmit={handleMasterPasswordSubmit} className="mt-5 space-y-4" aria-busy={isUnlocking}>
            {/* Master password brute force lockout banner */}
            {mpLockoutSeconds > 0 && (
              <div className="rounded-lg border border-rose-700 bg-rose-900/40 px-4 py-3 text-center text-xs text-rose-300">
                🔒 Too many wrong attempts.<br />
                <span className="font-bold text-rose-200">Try again in {mpLockoutSeconds}s</span>
                <span className="block mt-1 text-[10px] text-rose-400">Lockout increases with each violation</span>
              </div>
            )}
            {mpLockoutSeconds === 0 && mpFailedAttempts > 0 && mpFailedAttempts < 5 && (
              <p className="text-center text-[11px] text-amber-400 font-semibold">
                ⚠️ {5 - mpFailedAttempts} attempt{5 - mpFailedAttempts !== 1 ? 's' : ''} remaining before lockout
              </p>
            )}
            <div>
              <label className="text-xs font-semibold text-slate-300">Enter Master Password</label>
              {!hasVaultKey && (
                <div className="mt-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-200/90 leading-relaxed">
                  <div className="font-semibold text-amber-300 mb-0.5">⚠️ Full Master Password Required</div>
                  Your encryption key was wiped from memory during refresh for Zero-Knowledge security. Enter your full account password (12+ characters), not your 4-digit PIN.
                </div>
              )}
              <div className="relative mt-2">
                <input
                  ref={masterPasswordInputRef}
                  type={showMasterPassword ? 'text' : 'password'}
                  enterKeyHint="done"
                  autoComplete="current-password"
                  value={masterPassword}
                  onChange={(e) => {
                    setMasterPassword(e.target.value);
                    if (masterPasswordError) setMasterPasswordError('');
                  }}
                  placeholder="Master password (min 12 chars)"
                  className="lock-master-password w-full rounded-md border border-slate-700 bg-[#141b22] px-3 py-2.5 pr-10 text-sm text-white focus:border-slate-300 focus:outline-none"
                  disabled={isUnlocking || mpLockoutSeconds > 0}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowMasterPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none"
                  title={showMasterPassword ? 'Hide password' : 'Show password'}
                >
                  {showMasterPassword ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {masterPasswordError && (
              <p className="rounded-md border border-rose-800/70 bg-rose-950/40 px-3 py-2 text-xs leading-relaxed text-rose-300" role="alert">
                {masterPasswordError}
              </p>
            )}

            <button
              type="submit"
              disabled={isUnlocking || mpLockoutSeconds > 0}
              className="w-full rounded-md bg-white py-2.5 text-xs font-bold text-black shadow transition-all hover:bg-slate-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isUnlocking ? 'Unlocking vault…' : mpLockoutSeconds > 0 ? `Locked ${mpLockoutSeconds}s…` : 'Unlock Vault'}
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="w-full text-center text-[11px] text-slate-400 hover:text-rose-300 transition-colors"
            >
              Don't remember your master password? <span className="underline font-semibold text-rose-400">Log Out & Sign In Fresh</span>
            </button>

            {hasExistingPin && hasVaultKey && (
              <button
                type="button"
                onClick={() => setUsePasswordMode(false)}
                className="w-full text-center text-xs text-slate-400 hover:text-white"
              >
                ← Back to 4-Digit PIN
              </button>
            )}
            {!hasExistingPin && hasVaultKey && (
              <button
                type="button"
                onClick={() => { setUsePasswordMode(false); setIsSettingUpPin(true); setMasterPassword(''); }}
                className="w-full text-center text-xs text-slate-400 hover:text-white"
              >
                Set up a 4-Digit Quick PIN
              </button>
            )}
          </form>
        )}

        {/* Footer Actions: Settings & Logout */}
        <div className="lock-screen-footer mt-6 flex items-center justify-between border-t border-slate-800 pt-4 text-xs">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200"
          >
            <span>⏱️ Auto-Lock: {timeoutSetting === 0 ? 'Off' : `${timeoutSetting}m`}</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="text-rose-400 hover:text-rose-300 font-semibold"
          >
            Log Out
          </button>
        </div>

        {/* Inactivity Settings Popup */}
        {showSettings && (
          <div className="mt-3 rounded-lg border border-slate-700 bg-[#222d3b] p-3 text-xs">
            <span className="font-semibold text-slate-200">Auto-lock vault after inactivity:</span>
            <div className="mt-2 grid grid-cols-4 gap-1.5 text-center">
              {[1, 5, 15, 30].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleTimeoutChange(mins)}
                  className={`rounded py-1 font-semibold ${
                    timeoutSetting === mins
                      ? 'bg-white text-black'
                      : 'bg-[#141b22] text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
