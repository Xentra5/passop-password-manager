import { useState, useEffect, useRef, useCallback } from 'react';
import { getAutoLockTimeoutMinutes, setAutoLockTimeoutMinutes } from '../utils/pinAuth';

/**
 * Custom hook to monitor user idle inactivity and automatically lock the vault.
 */
export function useAutoLock(isActiveSession = false) {
  const [isLocked, setIsLocked] = useState(false);
  const [timeoutMinutes, setTimeoutMinutesState] = useState(() => getAutoLockTimeoutMinutes());
  const timerRef = useRef(null);

  const lockVault = useCallback(() => {
    if (isActiveSession) {
      setIsLocked(true);
    }
  }, [isActiveSession]);

  const unlockVault = useCallback(() => {
    setIsLocked(false);
  }, []);

  const updateTimeout = useCallback((mins) => {
    setAutoLockTimeoutMinutes(mins);
    setTimeoutMinutesState(mins);
  }, []);

  // Reset the countdown timer whenever user activity is detected
  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // If auto-lock is disabled (0) or session isn't active or already locked, do nothing
    if (!isActiveSession || timeoutMinutes <= 0 || isLocked) {
      return;
    }

    const ms = timeoutMinutes * 60 * 1000;
    timerRef.current = setTimeout(() => {
      setIsLocked(true);
    }, ms);
  }, [isActiveSession, timeoutMinutes, isLocked]);

  useEffect(() => {
    if (!isActiveSession || timeoutMinutes <= 0 || isLocked) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    resetTimer();

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    const handleActivity = () => resetTimer();

    events.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));

    // Lock automatically if user minimizes window or switches tabs for > 1 minute
    let hiddenTimestamp = null;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenTimestamp = Date.now();
      } else if (hiddenTimestamp) {
        const elapsedMinutes = (Date.now() - hiddenTimestamp) / 1000 / 60;
        if (timeoutMinutes > 0 && elapsedMinutes >= timeoutMinutes) {
          setIsLocked(true);
        }
        hiddenTimestamp = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActiveSession, timeoutMinutes, isLocked, resetTimer]);

  return {
    isLocked,
    lockVault,
    unlockVault,
    timeoutMinutes,
    updateTimeout,
  };
}
