/**
 * PassVault Background Service Worker — Manifest V3
 *
 * Acts as the secure vault proxy between the popup UI and the PassVault backend.
 *
 * Responsibilities:
 *  - Manage auth session with PassVault backend (HTTP-only cookies + CSRF)
 *  - Derive and store AES-256-GCM vault key in chrome.storage.session (tab-session scoped)
 *  - Decrypt credentials from the backend and pass to popup / content scripts
 *  - Forward fill requests to the active tab's content script
 *  - Track form detection signals from content scripts
 *
 * SECURITY NOTES:
 *  - Vault key raw bytes stored in chrome.storage.session (auto-cleared on browser close)
 *  - chrome.storage.session is NOT accessible to web pages or other extensions
 *  - Credentials are decrypted in this service worker, never sent to the backend in plaintext
 *  - extractable: true is required here because CryptoKey objects cannot be serialized
 *    to chrome.storage.session. The raw bytes are stored instead, then re-imported
 *    as non-extractable for actual crypto operations.
 */

'use strict';

const API_BASE = 'http://localhost:3000';
const ENCRYPTION_PREFIX = 'enc:v2:';
const PBKDF2_ITERATIONS = 600_000;

// ─── Crypto Helpers (inline, no imports — service worker module scope) ────────

function hexToBuffer(hex) {
  if (typeof hex !== 'string' || hex.length % 2 !== 0) throw new Error('Invalid hex');
  const buf = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) buf[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return buf;
}

/**
 * Derive AES-256-GCM key from master password + email + vaultSalt.
 * Returns raw key bytes (Uint8Array) so we can store in chrome.storage.session.
 */
async function deriveKeyBytes(masterPassword, email, vaultSalt) {
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(masterPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const combinedSalt = enc.encode(
    `passvault:kdf:v3:${email.toLowerCase().trim()}:${vaultSalt.toLowerCase()}`
  );

  // extractable: true so we can export and store in chrome.storage.session
  const cryptoKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: combinedSalt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    true, // must be extractable to serialize to storage
    ['encrypt', 'decrypt']
  );

  const rawBytes = await crypto.subtle.exportKey('raw', cryptoKey);
  return new Uint8Array(rawBytes);
}

/**
 * Re-import stored raw key bytes as a non-extractable CryptoKey for crypto ops.
 */
async function importKeyBytes(rawBytes) {
  return crypto.subtle.importKey(
    'raw',
    rawBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Decrypt a single enc:v2:ivHex:cipherHex credential using stored key bytes.
 */
async function decryptCredential(storedValue, keyBytes) {
  if (!storedValue || !storedValue.startsWith(ENCRYPTION_PREFIX)) return storedValue;

  const raw = storedValue.slice(ENCRYPTION_PREFIX.length);
  const parts = raw.split(':');
  if (parts.length !== 2) return storedValue;

  const [ivHex, cipherHex] = parts;
  const cryptoKey = await importKeyBytes(keyBytes);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: hexToBuffer(ivHex) },
    cryptoKey,
    hexToBuffer(cipherHex)
  );

  return new TextDecoder().decode(decrypted);
}

// ─── CSRF Token Management ────────────────────────────────────────────────────

let _csrfToken = null;

async function fetchCsrfToken() {
  try {
    const res = await fetch(`${API_BASE}/api/csrf-token`, {
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    _csrfToken = data.csrfToken || null;
    return _csrfToken;
  } catch {
    return null;
  }
}

async function getCsrfToken() {
  if (_csrfToken) return _csrfToken;
  return fetchCsrfToken();
}

// ─── Domain Matching ──────────────────────────────────────────────────────────

function extractDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function credentialMatchesDomain(credential, tabUrl) {
  if (!credential.site || !tabUrl) return false;
  const tabDomain = extractDomain(tabUrl);
  if (!tabDomain) return false;

  // Normalize the stored site: strip protocol, www, trailing slash
  let site = credential.site.trim();
  if (!/^https?:\/\//i.test(site)) site = 'https://' + site;

  const credDomain = extractDomain(site);
  if (!credDomain) return false;

  return tabDomain === credDomain || tabDomain.endsWith('.' + credDomain) || credDomain.endsWith('.' + tabDomain);
}

// ─── Message Handlers ─────────────────────────────────────────────────────────

/**
 * Check if the backend session is still active.
 */
async function handleGetAuthState() {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
    if (!res.ok) return { loggedIn: false };
    const data = await res.json();
    if (!data.success) return { loggedIn: false };

    // Refresh CSRF token
    _csrfToken = data.csrfToken || _csrfToken;

    return {
      loggedIn: true,
      user: data.user,
      vaultSalt: data.vaultSalt,
    };
  } catch {
    return { loggedIn: false };
  }
}

/**
 * Login to PassVault backend and derive vault key.
 */
async function handleLogin({ email, password: masterPassword }) {
  try {
    const csrf = await getCsrfToken();

    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      },
      body: JSON.stringify({ email, password: masterPassword }),
    });

    const data = await res.json();
    if (!data.success) {
      return { success: false, error: data.message || 'Login failed' };
    }

    _csrfToken = data.csrfToken || _csrfToken;

    // Derive vault key and store raw bytes in session storage
    const vaultSalt = data.vaultSalt;
    if (!vaultSalt) return { success: false, error: 'No vault salt returned from server' };

    const keyBytes = await deriveKeyBytes(masterPassword, email, vaultSalt);

    await chrome.storage.session.set({
      vaultKeyBytes: Array.from(keyBytes), // Store as plain array (serializable)
      vaultSalt,
      userEmail: email,
      userInfo: data.user,
    });

    return { success: true, user: data.user, vaultSalt };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Logout from backend and clear session storage.
 */
async function handleLogout() {
  try {
    const csrf = await getCsrfToken();
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: csrf ? { 'X-CSRF-Token': csrf } : {},
    });
  } catch {
    // Best-effort
  }

  _csrfToken = null;
  await chrome.storage.session.clear();
  return { success: true };
}

/**
 * Fetch and decrypt credentials matching the given tab URL.
 */
async function handleGetCredentials({ tabUrl }) {
  // Check vault is unlocked
  const session = await chrome.storage.session.get(['vaultKeyBytes']);
  if (!session.vaultKeyBytes) {
    return { success: false, locked: true, error: 'Vault is locked' };
  }

  const keyBytes = new Uint8Array(session.vaultKeyBytes);

  try {
    const res = await fetch(`${API_BASE}/api/passwords`, {
      credentials: 'include',
      headers: _csrfToken ? { 'X-CSRF-Token': _csrfToken } : {},
    });

    if (!res.ok) {
      if (res.status === 401) return { success: false, locked: true, error: 'Session expired' };
      return { success: false, error: `Server error: ${res.status}` };
    }

    const { passwords } = await res.json();

    // Filter by domain
    const matched = tabUrl
      ? passwords.filter((cred) => credentialMatchesDomain(cred, tabUrl))
      : passwords;

    // Decrypt passwords client-side
    const decrypted = await Promise.all(
      matched.map(async (cred) => {
        let plainPassword = cred.password;
        try {
          if (typeof cred.password === 'string' && cred.password.startsWith(ENCRYPTION_PREFIX)) {
            plainPassword = await decryptCredential(cred.password, keyBytes);
          }
        } catch {
          plainPassword = '[Decryption Failed]';
        }

        return {
          id: cred._id || cred.id,
          site: cred.site,
          username: cred.username,
          password: plainPassword,
          tag: cred.tag,
          favorite: cred.favorite,
        };
      })
    );

    return { success: true, credentials: decrypted };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Send fill command to the active tab's content script.
 */
async function handleFillForm({ tabId, username, password }) {
  if (!tabId) return { success: false, error: 'No tab ID provided' };

  try {
    const result = await chrome.tabs.sendMessage(tabId, {
      action: 'FILL_CREDENTIALS',
      username,
      password,
    });
    return result || { success: true };
  } catch (err) {
    // Content script may not be injected on this page (e.g. chrome:// pages)
    return { success: false, error: err.message };
  }
}

/**
 * Check if the vault key is currently in session storage.
 */
async function handleCheckVaultLocked() {
  const session = await chrome.storage.session.get(['vaultKeyBytes', 'userInfo']);
  return {
    locked: !session.vaultKeyBytes,
    userInfo: session.userInfo || null,
  };
}

// ─── Main Message Router ──────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action } = message;

  let handler;

  switch (action) {
    case 'GET_AUTH_STATE':
      handler = handleGetAuthState();
      break;
    case 'LOGIN':
      handler = handleLogin(message);
      break;
    case 'LOGOUT':
      handler = handleLogout();
      break;
    case 'GET_CREDENTIALS':
      handler = handleGetCredentials(message);
      break;
    case 'FILL_FORM':
      handler = handleFillForm(message);
      break;
    case 'CHECK_VAULT_LOCKED':
      handler = handleCheckVaultLocked();
      break;
    case 'PAGE_HAS_LOGIN_FORM':
      // Content script notification — just acknowledge
      sendResponse({ received: true });
      return false;
    default:
      sendResponse({ error: 'Unknown action' });
      return false;
  }

  handler
    .then((result) => sendResponse(result))
    .catch((err) => sendResponse({ success: false, error: err.message }));

  return true; // Keep message channel open for async response
});

// Refresh CSRF token on service worker startup
fetchCsrfToken().catch(() => {});
