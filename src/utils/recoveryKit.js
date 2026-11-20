/**
 * PassVault Emergency Vault Recovery Kit Engine
 *
 * Implements standard 256-bit zero-knowledge emergency recovery key generation,
 * BIP-39 24-word mnemonic encoding with SHA-256 checksum, emergency key wrapping,
 * and rescue ciphertext blob creation/decryption.
 */

import { BIP39_WORDS } from './bip39Words.js';
import { bufferToHex, hexToBuffer } from './cryptoVault.js';

const RESCUE_BLOB_PREFIX = 'rec:v1:';
const PBKDF2_RECOVERY_ITERATIONS = 100_000;
const PBKDF2_VAULT_ITERATIONS = 600_000;

const getCrypto = () => (typeof window !== 'undefined' ? window.crypto : globalThis.crypto);

// Lookup map for fast word index resolution
const WORD_INDEX_MAP = new Map();
BIP39_WORDS.forEach((word, idx) => WORD_INDEX_MAP.set(word, idx));

/**
 * Generates a fresh 256-bit cryptographic recovery key encoded into 24 BIP-39 words with checksum.
 * @returns {Promise<{ words: string[], keyString: string, entropyHex: string }>}
 */
export async function generate24WordRecoveryKey() {
  const cryptoObj = getCrypto();
  // 1. Generate 256 bits (32 bytes) of cryptographically secure random entropy
  const entropy = new Uint8Array(32);
  cryptoObj.getRandomValues(entropy);

  // 2. Compute 8-bit checksum: first byte of SHA-256(entropy)
  const hashBuffer = await cryptoObj.subtle.digest('SHA-256', entropy);
  const checksumByte = new Uint8Array(hashBuffer)[0];

  // 3. Assemble 264 bits: 256 bits of entropy + 8 bits of checksum
  const bits = [];
  for (let i = 0; i < 32; i++) {
    for (let b = 7; b >= 0; b--) {
      bits.push((entropy[i] >> b) & 1);
    }
  }
  for (let b = 7; b >= 0; b--) {
    bits.push((checksumByte >> b) & 1);
  }

  // 4. Group 264 bits into 24 groups of 11 bits (24 words)
  const words = [];
  for (let i = 0; i < 24; i++) {
    let wordIdx = 0;
    for (let b = 0; b < 11; b++) {
      wordIdx = (wordIdx << 1) | bits[i * 11 + b];
    }
    words.push(BIP39_WORDS[wordIdx]);
  }

  return {
    words,
    keyString: words.join(' '),
    entropyHex: bufferToHex(entropy),
  };
}

/**
 * Validates a 24-word recovery key string or array, verifying checksum integrity.
 * @param {string|string[]} wordsOrString
 * @returns {Promise<{ valid: boolean, error?: string, words?: string[], entropyHex?: string }>}
 */
export async function validateRecoveryKey(wordsOrString) {
  let rawWords = [];
  if (Array.isArray(wordsOrString)) {
    rawWords = wordsOrString.map(w => String(w || '').trim().toLowerCase()).filter(Boolean);
  } else if (typeof wordsOrString === 'string') {
    rawWords = wordsOrString.trim().toLowerCase().split(/[\s,]+/).filter(Boolean);
  }

  if (rawWords.length !== 24) {
    return {
      valid: false,
      error: `Expected exactly 24 words, but received ${rawWords.length}.`,
    };
  }

  // Verify all words exist in BIP-39 wordlist
  const bits = [];
  for (let i = 0; i < 24; i++) {
    const word = rawWords[i];
    const wordIdx = WORD_INDEX_MAP.get(word);
    if (wordIdx === undefined) {
      return {
        valid: false,
        error: `Word #${i + 1} "${word}" is not a valid recovery word.`,
      };
    }
    for (let b = 10; b >= 0; b--) {
      bits.push((wordIdx >> b) & 1);
    }
  }

  // Extract 256 bits entropy and 8 bits checksum
  const entropy = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bits[i * 8 + b];
    }
    entropy[i] = byteVal;
  }

  let receivedChecksum = 0;
  for (let b = 0; b < 8; b++) {
    receivedChecksum = (receivedChecksum << 1) | bits[256 + b];
  }

  // Verify checksum against SHA-256 of entropy
  const hashBuffer = await getCrypto().subtle.digest('SHA-256', entropy);
  const actualChecksum = new Uint8Array(hashBuffer)[0];

  if (receivedChecksum !== actualChecksum) {
    return {
      valid: false,
      error: 'Invalid recovery key checksum. Please double-check your 24 words.',
    };
  }

  return {
    valid: true,
    words: rawWords,
    entropyHex: bufferToHex(entropy),
  };
}

/**
 * Derives a 256-bit AES-GCM wrapping key from a validated recovery key and user vault salt.
 */
async function deriveEmergencyWrappingKey(recoveryKeyString, accountSalt) {
  const enc = new TextEncoder();
  const normalizedKey = recoveryKeyString.trim().toLowerCase().replace(/\s+/g, ' ');
  const passwordKey = await getCrypto().subtle.importKey(
    'raw',
    enc.encode(normalizedKey),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const saltBytes = enc.encode(`passvault:emergency:v1:${accountSalt.toLowerCase().trim()}`);

  return getCrypto().subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_RECOVERY_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Derives raw 32 bytes of the vault key from the master password (temporary in memory for wrapping).
 */
export async function deriveRawVaultKeyBytes(masterPassword, email, accountSalt) {
  const enc = new TextEncoder();
  const passwordKey = await getCrypto().subtle.importKey(
    'raw',
    enc.encode(masterPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const combinedSalt = enc.encode(`passvault:kdf:v3:${email.toLowerCase().trim()}:${accountSalt.toLowerCase().trim()}`);

  const exportableKey = await getCrypto().subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: combinedSalt,
      iterations: PBKDF2_VAULT_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    true, // extractable only temporarily to export raw bytes
    ['encrypt', 'decrypt']
  );

  const rawBuffer = await getCrypto().subtle.exportKey('raw', exportableKey);
  return new Uint8Array(rawBuffer);
}

/**
 * Imports raw 32 bytes into standard non-extractable CryptoKey for vault operations.
 */
export async function importRawVaultKey(rawKeyBytes) {
  return getCrypto().subtle.importKey(
    'raw',
    rawKeyBytes,
    { name: 'AES-GCM' },
    false, // non-extractable in memory
    ['encrypt', 'decrypt']
  );
}

/**
 * Creates an encrypted emergency rescue blob from raw vault key bytes.
 * Output: rec:v1:<ivHex>:<ciphertextHex>
 */
export async function createEmergencyRescueBlob(rawVaultKeyBytes, recoveryKeyString, accountSalt) {
  const wrappingKey = await deriveEmergencyWrappingKey(recoveryKeyString, accountSalt);
  const iv = getCrypto().getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await getCrypto().subtle.encrypt(
    { name: 'AES-GCM', iv },
    wrappingKey,
    rawVaultKeyBytes
  );

  return `${RESCUE_BLOB_PREFIX}${bufferToHex(iv)}:${bufferToHex(encryptedBuffer)}`;
}

/**
 * Decrypts an emergency rescue blob with the 24-word recovery key, returning raw vault key bytes.
 */
export async function decryptEmergencyRescueBlob(rescueCiphertext, recoveryKeyString, accountSalt) {
  if (typeof rescueCiphertext !== 'string' || !rescueCiphertext.startsWith(RESCUE_BLOB_PREFIX)) {
    throw new Error('Invalid rescue blob format');
  }

  const raw = rescueCiphertext.slice(RESCUE_BLOB_PREFIX.length);
  const parts = raw.split(':');
  if (parts.length !== 2) throw new Error('Malformed rescue blob payload');

  const [ivHex, cipherHex] = parts;
  const iv = hexToBuffer(ivHex);
  const cipherData = hexToBuffer(cipherHex);

  const wrappingKey = await deriveEmergencyWrappingKey(recoveryKeyString, accountSalt);

  const decryptedBuffer = await getCrypto().subtle.decrypt(
    { name: 'AES-GCM', iv },
    wrappingKey,
    cipherData
  );

  return new Uint8Array(decryptedBuffer);
}

/**
 * Generates formatted text document for offline saving (.txt).
 */
export function generateEmergencyKitText({ email, accountSalt, words, createdAt = new Date() }) {
  const dateStr = createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const wordsGrid = words
    .map((word, idx) => {
      const num = String(idx + 1).padStart(2, '0');
      return `${num}. ${word.padEnd(12, ' ')}`;
    })
    .reduce((rows, item, idx) => {
      if (idx % 4 === 0) rows.push([]);
      rows[rows.length - 1].push(item);
      return rows;
    }, [])
    .map(row => '   ' + row.join(' '))
    .join('\n');

  return `================================================================================
                       PASSVAULT EMERGENCY RECOVERY KIT
================================================================================
CONFIDENTIAL - KEEP THIS DOCUMENT IN A SECURE OFFLINE LOCATION (SAFE / VAULT)

Your PassVault uses zero-knowledge encryption. If you forget your master
password, this Emergency Kit is the ONLY WAY to recover your account and vault.

--------------------------------------------------------------------------------
ACCOUNT DETAILS
--------------------------------------------------------------------------------
Account Email:       ${email}
Account Identifier:  ${accountSalt}
Date Generated:      ${dateStr}

--------------------------------------------------------------------------------
24-WORD EMERGENCY RECOVERY KEY
--------------------------------------------------------------------------------
${wordsGrid}

--------------------------------------------------------------------------------
RECOVERY INSTRUCTIONS
--------------------------------------------------------------------------------
1. Navigate to your PassVault login screen.
2. Select "Forgot Master Password? Recover with Emergency Kit".
3. Enter your account email and the 24 words listed above in order.
4. Set a new master password. Your vault will be decrypted using this key
   and safely re-encrypted with your new master password.

DO NOT SHARE THIS RECOVERY KIT WITH ANYONE. PASSVAULT EMPLOYEES WILL NEVER
ASK FOR YOUR 24 RECOVERY WORDS.
================================================================================
Generated with PassVault Zero-Knowledge Cryptography • WebCrypto AES-256-GCM
`;
}
