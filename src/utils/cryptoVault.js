/**
 * Client-Side Zero-Knowledge Cryptography Module for PassOP
 *
 * All encryption and decryption occurs strictly in the user's browser using
 * the standard Web Crypto API (SubtleCrypto). Plaintext credentials never
 * traverse the network and the backend server only ever receives opaque ciphertext.
 */

const ENCRYPTION_PREFIX = 'enc:v2:';
const PBKDF2_ITERATIONS = 100000;
const SESSION_STORAGE_KEY = 'passvault_session_vault_key';

// Convert ArrayBuffer to Hex string
function bufferToHex(buffer) {
  const byteArray = new Uint8Array(buffer);
  return Array.from(byteArray, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Convert Hex string to Uint8Array
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
 * Derives a 256-bit AES-GCM CryptoKey from the user's master password and email.
 * Uses PBKDF2 with 100,000 iterations of SHA-256.
 *
 * @param {string} masterPassword - User's master password entered at login/signup
 * @param {string} email - User's email address used as cryptographic salt
 * @returns {Promise<CryptoKey>} - Derived AES-GCM CryptoKey
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

  const salt = enc.encode(`passvault:zero-knowledge:salt:${email.toLowerCase().trim()}`);

  const vaultKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    true, // extractable so we can persist in volatile sessionStorage for the active tab
    ['encrypt', 'decrypt']
  );

  // Persist raw key in volatile sessionStorage for active tab survival
  try {
    const rawKeyBuffer = await window.crypto.subtle.exportKey('raw', vaultKey);
    sessionStorage.setItem(SESSION_STORAGE_KEY, bufferToHex(rawKeyBuffer));
  } catch (err) {
    console.warn('Could not cache session key in sessionStorage:', err);
  }

  return vaultKey;
}

/**
 * Retrieves the cached vault key from volatile sessionStorage if present in active tab.
 * @returns {Promise<CryptoKey|null>}
 */
export async function getCachedVaultKey() {
  try {
    const rawHex = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!rawHex) return null;

    const rawBuffer = hexToBuffer(rawHex);
    return await window.crypto.subtle.importKey(
      'raw',
      rawBuffer,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  } catch (err) {
    console.warn('Failed to restore cached vault key:', err);
    return null;
  }
}

/**
 * Clears the cached session key upon user logout.
 */
export function clearCachedVaultKey() {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear sessionStorage key:', err);
  }
}

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
    console.warn('No vaultKey provided for encryption, returning value');
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
  } catch (err) {
    console.error('Failed to decrypt credential with client key:', err);
    return '[Decryption Failed]';
  }
}
