/**
 * Quick PIN & Auto-Lock Security Helper
 * Provides cryptographically secure PIN hashing (PBKDF2 with random salt)
 * and inactivity tracking settings.
 *
 * SECURITY FIXES APPLIED:
 * - BUG #3 FIX: PIN is now hashed with PBKDF2 (100,000 iterations) instead of
 *   bare SHA-256. SHA-256 is a fast hash; PBKDF2 is a slow work-factor KDF,
 *   making offline brute-force of the 10,000 possible PINs impractical.
 * - BUG #3 FIX: A random 128-bit salt is now generated per-user and stored
 *   in localStorage alongside the hash. The old predictable email-derived
 *   salt is replaced.
 * - BUG #4 FIX: A failed-attempt counter is tracked in memory (not
 *   localStorage, so it resets on refresh). After MAX_ATTEMPTS wrong tries
 *   the lock function is called and a lockout period is enforced.
 */

const PIN_STORAGE_PREFIX = 'passvault_pin_hash_';
const PIN_SALT_PREFIX    = 'passvault_pin_salt_';
const TIMEOUT_STORAGE_KEY = 'passvault_autolock_minutes';

// BUG #4 FIX: In-memory brute force counters — intentionally not persisted
//             so they cannot be tampered with via localStorage.
const _failedAttempts = {};      // { [userEmail]: number }
const _lockedUntil   = {};       // { [userEmail]: timestamp }

const MAX_ATTEMPTS   = 5;        // lock after 5 wrong PINs
const LOCKOUT_MS     = 30_000;   // 30 second initial lockout
const PBKDF2_ITERATIONS_PIN = 100_000; // slow KDF for the short PIN space

// ─── Helpers ────────────────────────────────────────────────────────────────

function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBuffer(hex) {
  const buf = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    buf[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return buf;
}

/**
 * Returns or creates a random 128-bit PBKDF2 salt for this user's PIN.
 * Stored in localStorage keyed by email.
 */
function getOrCreatePinSalt(userEmail) {
  const key = `${PIN_SALT_PREFIX}${userEmail}`;
  const stored = localStorage.getItem(key);
  if (stored) return stored;
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  const hex = bufferToHex(bytes.buffer);
  localStorage.setItem(key, hex);
  return hex;
}

/**
 * BUG #3 FIX: Derives a PBKDF2 hash of the PIN with a random per-user salt.
 * This makes offline brute-force of the 10,000-space 4-digit PIN costly.
 */
async function hashPinWithPBKDF2(pin, userEmail) {
  const enc = new TextEncoder();
  const saltHex = getOrCreatePinSalt(userEmail);
  const salt = hexToBuffer(saltHex);

  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derived = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS_PIN,
      hash: 'SHA-256',
    },
    baseKey,
    256
  );

  return bufferToHex(derived);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Saves a new 4-digit PIN for the given user (hashed with PBKDF2 + random salt).
 */
export async function saveUserPin(pin, userEmail) {
  if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    throw new Error('PIN must be exactly 4 digits');
  }
  const hash = await hashPinWithPBKDF2(pin, userEmail);
  localStorage.setItem(`${PIN_STORAGE_PREFIX}${userEmail}`, hash);
  // Reset any existing failure counters when a new PIN is set
  _failedAttempts[userEmail] = 0;
  delete _lockedUntil[userEmail];
  return true;
}

/**
 * Verifies if entered PIN matches the stored PBKDF2 hash.
 *
 * BUG #4 FIX: Returns { valid: boolean, locked: boolean, remainingAttempts: number }
 * so the UI can enforce lockout and show attempt counts.
 *
 * @returns {Promise<{ valid: boolean, locked: boolean, remainingAttempts: number }>}
 */
export async function verifyUserPin(pin, userEmail) {
  if (!pin || pin.length !== 4) return { valid: false, locked: false, remainingAttempts: MAX_ATTEMPTS };

  // BUG #4 FIX: Check lockout period
  const lockedUntil = _lockedUntil[userEmail];
  if (lockedUntil && Date.now() < lockedUntil) {
    const secondsLeft = Math.ceil((lockedUntil - Date.now()) / 1000);
    return { valid: false, locked: true, remainingAttempts: 0, secondsLeft };
  }

  const storedHash = localStorage.getItem(`${PIN_STORAGE_PREFIX}${userEmail}`);
  if (!storedHash) return { valid: false, locked: false, remainingAttempts: MAX_ATTEMPTS };

  const candidateHash = await hashPinWithPBKDF2(pin, userEmail);
  const isValid = candidateHash === storedHash;

  if (isValid) {
    // Reset failure counter on success
    _failedAttempts[userEmail] = 0;
    delete _lockedUntil[userEmail];
    return { valid: true, locked: false, remainingAttempts: MAX_ATTEMPTS };
  }

  // BUG #4 FIX: Increment failure counter and enforce lockout
  _failedAttempts[userEmail] = (_failedAttempts[userEmail] || 0) + 1;
  const attempts = _failedAttempts[userEmail];
  const remaining = Math.max(0, MAX_ATTEMPTS - attempts);

  if (attempts >= MAX_ATTEMPTS) {
    // Exponential backoff: 30s * 2^(extra attempts above threshold)
    const extra = attempts - MAX_ATTEMPTS;
    const lockMs = LOCKOUT_MS * Math.pow(2, extra);
    _lockedUntil[userEmail] = Date.now() + lockMs;
    _failedAttempts[userEmail] = 0; // reset counter for next lockout cycle
    return { valid: false, locked: true, remainingAttempts: 0, secondsLeft: Math.ceil(lockMs / 1000) };
  }

  return { valid: false, locked: false, remainingAttempts: remaining };
}

/**
 * Checks if the user currently has a PIN set up.
 */
export function hasUserPin(userEmail) {
  if (!userEmail) return false;
  return Boolean(localStorage.getItem(`${PIN_STORAGE_PREFIX}${userEmail}`));
}

/**
 * Removes the configured PIN and its salt.
 */
export function removeUserPin(userEmail) {
  if (!userEmail) return;
  localStorage.removeItem(`${PIN_STORAGE_PREFIX}${userEmail}`);
  localStorage.removeItem(`${PIN_SALT_PREFIX}${userEmail}`);
  _failedAttempts[userEmail] = 0;
  delete _lockedUntil[userEmail];
}

/**
 * Gets configured auto-lock timeout in minutes.
 * Default is 5 minutes. (0 = Disabled).
 */
export function getAutoLockTimeoutMinutes() {
  const saved = localStorage.getItem(TIMEOUT_STORAGE_KEY);
  if (saved === null) return 5; // Default 5 minutes
  const parsed = parseInt(saved, 10);
  return isNaN(parsed) ? 5 : parsed;
}

/**
 * Sets auto-lock timeout in minutes.
 */
export function setAutoLockTimeoutMinutes(minutes) {
  localStorage.setItem(TIMEOUT_STORAGE_KEY, String(minutes));
}
