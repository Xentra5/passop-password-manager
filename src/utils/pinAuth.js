/**
 * Quick PIN & Auto-Lock Security Helper
 * Provides cryptographically secure PIN hashing (SHA-256 with salt)
 * and inactivity tracking settings.
 */

const PIN_STORAGE_PREFIX = 'passvault_pin_hash_';
const TIMEOUT_STORAGE_KEY = 'passvault_autolock_minutes';

/**
 * Computes SHA-256 hash of a 4-digit PIN with user-specific salt.
 */
async function hashPinWithSalt(pin, userEmail) {
  const enc = new TextEncoder();
  const salt = `passvault:quick-pin:v1:${(userEmail || 'user').toLowerCase().trim()}`;
  const data = enc.encode(`${salt}:${pin}`);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Saves a new 4-digit PIN for the given user.
 */
export async function saveUserPin(pin, userEmail) {
  if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    throw new Error('PIN must be exactly 4 digits');
  }
  const hash = await hashPinWithSalt(pin, userEmail);
  localStorage.setItem(`${PIN_STORAGE_PREFIX}${userEmail}`, hash);
  return true;
}

/**
 * Verifies if entered PIN matches the stored hash.
 */
export async function verifyUserPin(pin, userEmail) {
  if (!pin || pin.length !== 4) return false;
  const storedHash = localStorage.getItem(`${PIN_STORAGE_PREFIX}${userEmail}`);
  if (!storedHash) return false;

  const candidateHash = await hashPinWithSalt(pin, userEmail);
  return candidateHash === storedHash;
}

/**
 * Checks if the user currently has a PIN set up.
 */
export function hasUserPin(userEmail) {
  if (!userEmail) return false;
  return Boolean(localStorage.getItem(`${PIN_STORAGE_PREFIX}${userEmail}`));
}

/**
 * Removes the configured PIN.
 */
export function removeUserPin(userEmail) {
  if (!userEmail) return;
  localStorage.removeItem(`${PIN_STORAGE_PREFIX}${userEmail}`);
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
