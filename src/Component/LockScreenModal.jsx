import { useState, useEffect, useRef } from 'react';
import { toast, Bounce } from 'react-toastify';
import {
  verifyUserPin,
  saveUserPin,
  hasUserPin,
  getAutoLockTimeoutMinutes,
  setAutoLockTimeoutMinutes,
} from '../utils/pinAuth';

export default function LockScreenModal({
  isOpen,
  user,
  onUnlock,
  onLogout,
  onUnlockWithMasterPassword,
}) {
  const [pin, setPin] = useState('');
  const [hasExistingPin, setHasExistingPin] = useState(false);
  const [isSettingUpPin, setIsSettingUpPin] = useState(false);
  const [confirmPin, setConfirmPin] = useState('');
  const [shake, setShake] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [usePasswordMode, setUsePasswordMode] = useState(false);
  const [timeoutSetting, setTimeoutSetting] = useState(5);
  const [showSettings, setShowSettings] = useState(false);
  const inputRef = useRef(null);

  const userEmail = user?.email || 'user';

  // Check if PIN is configured whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const pinExists = hasUserPin(userEmail);
      setHasExistingPin(pinExists);
      setIsSettingUpPin(!pinExists);
      setPin('');
      setConfirmPin('');
      setMasterPassword('');
      setUsePasswordMode(false);
      setTimeoutSetting(getAutoLockTimeoutMinutes());
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, userEmail]);

  if (!isOpen) return null;

  const triggerErrorShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 450);
    setPin('');
  };

  const handleKeypadPress = async (digit) => {
    if (pin.length >= 4) return;
    const nextPin = pin + digit;
    setPin(nextPin);

    // If reached 4 digits, evaluate automatically
    if (nextPin.length === 4) {
      if (isSettingUpPin) {
        // Step 1 of PIN setup complete
        return;
      }

      // Verify existing PIN
      const isValid = await verifyUserPin(nextPin, userEmail);
      if (isValid) {
        toast.success('Vault unlocked!', {
          theme: 'dark',
          transition: Bounce,
          autoClose: 1500,
        });
        onUnlock();
      } else {
        toast.error('Incorrect PIN. Please try again.', { theme: 'dark', autoClose: 1800 });
        triggerErrorShake();
      }
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
    if (!masterPassword) return;

    try {
      if (onUnlockWithMasterPassword) {
        await onUnlockWithMasterPassword(masterPassword);
      }
      onUnlock();
    } catch (err) {
      toast.error(err.message || 'Incorrect master password', { theme: 'dark' });
      triggerErrorShake();
    }
  };

  const handleTimeoutChange = (minutes) => {
    setAutoLockTimeoutMinutes(minutes);
    setTimeoutSetting(minutes);
    toast.info(`Auto-lock set to ${minutes === 0 ? 'Never' : `${minutes} minutes`}`, {
      theme: 'dark',
      autoClose: 1500,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141b22]/75 p-4 backdrop-blur-md animate-fadeIn">
      {/* Invisible global keyboard listener for numpad typing */}
      <input
        ref={inputRef}
        type="password"
        pattern="[0-9]*"
        maxLength={4}
        value={pin}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '');
          if (val.length <= 4) {
            setPin(val);
            if (val.length === 4 && !isSettingUpPin) {
              verifyUserPin(val, userEmail).then((isValid) => {
                if (isValid) {
                  onUnlock();
                } else {
                  triggerErrorShake();
                }
              });
            }
          }
        }}
        className="opacity-0 absolute pointer-events-none"
        aria-hidden="true"
      />

      <div
        className={`relative w-full max-w-sm rounded-2xl border border-[#303846] bg-[#1a232e] p-6 shadow-2xl text-white transition-all ${
          shake ? 'animate-shake ring-2 ring-rose-500/50' : ''
        }`}
      >
        {/* Top Lock Icon & Header */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#2b3949] bg-[#222d3b] text-emerald-400 shadow-inner">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>

          <h3 className="font-['Space_Grotesk'] text-xl font-bold tracking-tight text-white">
            Vault Locked
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {userEmail}
          </p>
        </div>

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
                    className={`h-4 w-4 rounded-full border-2 transition-all duration-200 ${
                      filled
                        ? 'border-emerald-400 bg-emerald-400 scale-110 shadow-[0_0_10px_rgba(52,211,153,0.5)]'
                        : 'border-slate-600 bg-transparent'
                    }`}
                  />
                );
              })}
            </div>

            <p className="mt-2 text-[11px] text-slate-400">
              Enter 4-digit PIN (type on keyboard or tap below)
            </p>

            {/* Numeric Keypad */}
            <div className="mt-5 grid grid-cols-3 gap-2.5 w-full max-w-[240px]">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(String(num))}
                  className="flex h-12 items-center justify-center rounded-xl border border-slate-700/60 bg-[#222d3b]/80 font-mono text-lg font-semibold text-white shadow-sm transition-all hover:border-slate-500 hover:bg-[#2c394a] active:scale-95"
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
                className="flex h-12 items-center justify-center rounded-xl border border-slate-700/60 bg-[#222d3b]/80 font-mono text-lg font-semibold text-white shadow-sm transition-all hover:border-slate-500 hover:bg-[#2c394a] active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="flex h-12 items-center justify-center rounded-xl border border-slate-700/60 bg-[#222d3b]/80 text-slate-400 transition-all hover:border-slate-500 hover:text-white active:scale-95"
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
                className="text-emerald-400 hover:underline"
              >
                Unlock with Master Password instead
              </button>

              <button
                type="button"
                onClick={() => setIsSettingUpPin(true)}
                className="text-slate-400 hover:text-slate-200"
              >
                Change 4-Digit PIN
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
                className="mt-1 w-full rounded-md border border-slate-700 bg-[#141b22] px-3 py-2 text-center font-mono text-sm tracking-widest text-white focus:border-emerald-400 focus:outline-none"
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
                className="mt-1 w-full rounded-md border border-slate-700 bg-[#141b22] px-3 py-2 text-center font-mono text-sm tracking-widest text-white focus:border-emerald-400 focus:outline-none"
                required
              />
            </div>

            <div className="flex gap-2">
              {hasExistingPin && (
                <button
                  type="button"
                  onClick={() => setIsSettingUpPin(false)}
                  className="w-1/2 rounded-md border border-slate-700 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="w-full rounded-md bg-emerald-600 py-2 text-xs font-bold text-white shadow transition-all hover:bg-emerald-500 active:scale-95"
              >
                Save PIN & Unlock
              </button>
            </div>
          </form>
        )}

        {/* PASSWORD MODE: Unlock with Full Master Password */}
        {usePasswordMode && (
          <form onSubmit={handleMasterPasswordSubmit} className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300">Enter Master Password</label>
              <input
                type="password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                placeholder="Master password"
                className="mt-1.5 w-full rounded-md border border-slate-700 bg-[#141b22] px-3 py-2.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-emerald-600 py-2.5 text-xs font-bold text-white shadow transition-all hover:bg-emerald-500 active:scale-95"
            >
              Unlock Vault
            </button>

            {hasExistingPin && (
              <button
                type="button"
                onClick={() => setUsePasswordMode(false)}
                className="w-full text-center text-xs text-slate-400 hover:text-white"
              >
                ← Back to 4-Digit PIN
              </button>
            )}
          </form>
        )}

        {/* Footer Actions: Settings & Logout */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4 text-xs">
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
                      ? 'bg-emerald-600 text-white'
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
