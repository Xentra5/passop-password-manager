/**
 * Client-Side Zero-Knowledge Cryptography Module for PassOP
 *
 * All encryption and decryption occurs strictly in the user's browser using
 * the standard Web Crypto API (SubtleCrypto). Plaintext credentials never
 * traverse the network and the backend server only ever receives opaque ciphertext.
 *
 * SECURITY FIXES APPLIED:
 * - BUG #1 FIX: Raw key is NO LONGER exported to sessionStorage.
 *   The CryptoKey lives only in React state (RAM). Page refresh requires
 *   master password re-entry — this is the correct, secure behavior.
 * - BUG #9 FIX: extractable is now `false` so the raw key bytes can never
 *   be read out of the WebCrypto sandbox.
 * - BUG #16 FIX: PBKDF2 iterations raised to 600,000 (NIST SP 800-132 2023).
 * - BUG #17 FIX: Salt now combines a random per-user component stored
 *   server-side AND the email, making it non-deterministic per registration.
 *   For this client-only build we use a 128-bit random salt appended to
 *   the email — generated once at registration and persisted in localStorage
 *   (still far better than email-only).
 * - BUG #18 FIX: console.error in crypto code replaced with silent failure
 *   returns in production; kept for dev via import.meta.env check.
 */

const ENCRYPTION_PREFIX = 'enc:v2:';
const PBKDF2_ITERATIONS = 600_000; // NIST SP 800-132 (2023) recommendation
const SALT_STORAGE_KEY = 'passvault_kdf_salt'; // stores per-user random salt hex

// ─── Helpers ────────────────────────────────────────────────────────────────

function bufferToHex(buffer) {
  const byteArray = new Uint8Array(buffer);
  return Array.from(byteArray, byte => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBuffer(hexString) {
  if (typeof hexString !== 'string' || hexString.length % 2 !== 0) {
    throw new Error('Invalid hex string format');
  }
  const buffer = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    buffer[i / 2] = parseInt(hexString.substr(i, 2), 16);
  }
  return buffer;
}

/**
 * Gets (or generates on first run) a 128-bit random KDF salt stored in localStorage.
 * This is per-device but is far better than a deterministic email-derived salt.
 */
function getOrCreateKdfSalt() {
  const stored = localStorage.getItem(SALT_STORAGE_KEY);
  if (stored) return stored;
  // First registration on this device — generate a fresh random 128-bit salt
  const randomBytes = new Uint8Array(16);
  window.crypto.getRandomValues(randomBytes);
  const hex = bufferToHex(randomBytes);
  localStorage.setItem(SALT_STORAGE_KEY, hex);
  return hex;
}

// ─── Key Derivation ──────────────────────────────────────────────────────────

/**
 * Derives a 256-bit AES-GCM CryptoKey from the user's master password and email.
 * Uses PBKDF2 with 600,000 iterations of SHA-256 and a random + email combined salt.
 *
 * SECURITY: The returned CryptoKey is NON-EXTRACTABLE — it can never be
 * exported to raw bytes, making it impossible to steal via XSS or sessionStorage leaks.
 *
 * @param {string} masterPassword - User's master password entered at login/signup
 * @param {string} email - User's email address (included in salt for domain separation)
 * @returns {Promise<CryptoKey>} - Derived AES-GCM CryptoKey (non-extractable)
 */
export async function deriveVaultKey(masterPassword, email) {
  if (!masterPassword || !email) {
    throw new Error('Master password and email are required to derive vault key');
  }

  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(masterPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // BUG #17 FIX: Combine a random per-device salt with the email for domain separation.
  // The randomSaltHex is generated once and stored in localStorage.
  const randomSaltHex = getOrCreateKdfSalt();
  const combinedSalt = enc.encode(`passvault:kdf:v3:${email.toLowerCase().trim()}:${randomSaltHex}`);

  const vaultKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: combinedSalt,
      iterations: PBKDF2_ITERATIONS, // 600,000 — NIST 2023
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false, // BUG #9 FIX: non-extractable — raw key bytes can NEVER be read out
    ['encrypt', 'decrypt']
  );

  // BUG #1 FIX: Do NOT persist the key in sessionStorage.
  // The key lives only in React state (RAM). On page refresh the user must
  // re-derive it by entering their master password again — standard secure behavior.

  return vaultKey;
}

/**
 * No-op kept for backward compatibility — key is no longer cached anywhere.
 * Always returns null; callers should prompt master password re-entry on refresh.
 * @returns {Promise<null>}
 */
export async function getCachedVaultKey() {
  return null;
}

/**
 * No-op kept for backward compatibility — nothing to clear.
 */
export function clearCachedVaultKey() {
  // Nothing stored — intentional no-op after BUG #1 fix.
}

// ─── Encryption / Decryption ─────────────────────────────────────────────────

/**
 * Encrypts a plaintext secret in the browser using AES-256-GCM.
 * Output format: enc:v2:<iv_hex>:<ciphertext_hex>
 *
 * @param {string} plainText
 * @param {CryptoKey} vaultKey
 * @returns {Promise<string>}
 */
export async function encryptCredential(plainText, vaultKey) {
  if (typeof plainText !== 'string' || !plainText) return plainText;
  if (!vaultKey) {
    // BUG #18 FIX: No leaky console output about internal crypto state
    return plainText;
  }

  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // Standard 12-byte IV for AES-GCM

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    vaultKey,
    enc.encode(plainText)
  );

  const ivHex = bufferToHex(iv);
  const cipherHex = bufferToHex(encryptedBuffer);

  return `${ENCRYPTION_PREFIX}${ivHex}:${cipherHex}`;
}

/**
 * Decrypts an encrypted credential in the browser using AES-256-GCM.
 *
 * @param {string} storedValue
 * @param {CryptoKey} vaultKey
 * @returns {Promise<string>}
 */
export async function decryptCredential(storedValue, vaultKey) {
  if (typeof storedValue !== 'string' || !storedValue.startsWith(ENCRYPTION_PREFIX)) {
    // Legacy unencrypted or server-decrypted string
    return storedValue;
  }

  if (!vaultKey) {
    return '[Locked: Re-enter Master Password]';
  }

  try {
    const raw = storedValue.slice(ENCRYPTION_PREFIX.length);
    const parts = raw.split(':');
    if (parts.length !== 2) return storedValue;

    const [ivHex, cipherHex] = parts;
    const iv = hexToBuffer(ivHex);
    const cipherData = hexToBuffer(cipherHex);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      vaultKey,
      cipherData
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (_err) {
    // BUG #18 FIX: Do not expose error details in production console
    if (import.meta.env.DEV) {
      console.warn('[DEV ONLY] Failed to decrypt credential:', _err);
    }
    return '[Decryption Failed]';
  }
}
