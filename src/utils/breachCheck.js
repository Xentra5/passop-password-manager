/**
 * Privacy-Preserving Breach Detection Engine
 * Uses the HaveIBeenPwned (HIBP) k-Anonymity API.
 *
 * HOW IT WORKS (Zero-Knowledge / k-Anonymity):
 * 1. Plaintext password is converted to SHA-1 hash in the browser via Web Crypto.
 * 2. Only the first 5 characters (prefix) are sent to the HIBP API.
 * 3. HIBP returns ~500-1000 matching hash suffixes of previously breached passwords.
 * 4. The browser checks if the remaining 35 characters match any returned suffix.
 * The actual password and its full hash NEVER leave the browser!
 *
 * SECURITY FIXES APPLIED:
 * - BUG #5 FIX: Cache is now keyed by the SHA-1 prefix (first 5 hex chars),
 *   NOT the plaintext password. This means no plaintext passwords are ever
 *   held in the cache Map.
 * - BUG #14 FIX: Cache entries now have a TTL of 1 hour so they expire and
 *   force a fresh HIBP check on re-scan.
 */

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// BUG #5 FIX: Cache keyed by SHA-1 prefix (5 hex chars), NOT plaintext password.
// Each entry: { result: { pwned, count }, expiresAt: timestamp }
const breachCache = new Map();

/**
 * Computes SHA-1 hash of a string using the native Web Crypto API.
 * @param {string} message
 * @returns {Promise<string>} Upper-cased hex hash string
 */
export async function sha1(message) {
  const enc = new TextEncoder();
  const data = enc.encode(message);
  const hashBuffer = await window.crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * Checks if a single password has appeared in known data breaches.
 *
 * @param {string} password - Plaintext password to evaluate
 * @returns {Promise<{ pwned: boolean, count: number, error?: boolean }>}
 */
export async function checkPasswordBreach(password) {
  if (!password || typeof password !== 'string') {
    return { pwned: false, count: 0 };
  }

  const fullHash = await sha1(password);
  const prefix = fullHash.slice(0, 5);
  const suffix = fullHash.slice(5);

  // BUG #5 + #14 FIX: Cache keyed by hash prefix with TTL check — never stores plaintext
  const cached = breachCache.get(prefix);
  if (cached && Date.now() < cached.expiresAt) {
    // Find if this specific suffix is in the cached response suffixes map
    return cached.suffixMap.has(suffix)
      ? { pwned: true, count: cached.suffixMap.get(suffix) }
      : { pwned: false, count: 0 };
  }

  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      method: 'GET',
      headers: {
        'Add-Padding': 'true', // Mitigates traffic-analysis side-channel risks
      },
    });

    if (!response.ok) {
      throw new Error(`HIBP API returned HTTP ${response.status}`);
    }

    const responseText = await response.text();
    const lines = responseText.split('\n');

    // Build a suffix → count map for this prefix and cache the entire map
    const suffixMap = new Map();
    for (const line of lines) {
      const parts = line.trim().split(':');
      if (parts[0]) {
        suffixMap.set(parts[0].toUpperCase(), parseInt(parts[1], 10) || 1);
      }
    }

    // BUG #5 FIX: Store the suffix map (NOT plaintext) in cache with a TTL
    breachCache.set(prefix, {
      suffixMap,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    if (suffixMap.has(suffix)) {
      return { pwned: true, count: suffixMap.get(suffix) };
    }
    return { pwned: false, count: 0 };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('HIBP breach check query failed:', error);
    }
    return { pwned: false, count: 0, error: true };
  }
}

/**
 * Performs a comprehensive security audit on an array of vault items.
 * Detects:
 * 1. Reused passwords across distinct accounts
 * 2. Weak passwords (< 10 chars, lacking entropy)
 * 3. Breached passwords (from breach check map)
 * Calculates a consolidated Security Health Score (0–100%).
 *
 * @param {Array} passwordList - Array of stored vault items
 * @param {Map<string, { pwned: boolean, count: number }>} breachResultsMap
 * @returns {Object} Comprehensive audit summary
 */
export function auditVaultSecurity(passwordList = [], breachResultsMap = new Map()) {
  if (!passwordList.length) {
    return {
      score: 100,
      grade: 'Fortified',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500',
      reusedCount: 0,
      weakCount: 0,
      breachedCount: 0,
      reusedMap: {},
      weakIds: new Set(),
      breachedIds: new Set(),
      total: 0,
    };
  }

  // 1. Identify reused passwords
  const passwordOccurrences = new Map();
  passwordList.forEach(item => {
    if (!item.password) return;
    const existing = passwordOccurrences.get(item.password) || [];
    existing.push(item);
    passwordOccurrences.set(item.password, existing);
  });

  const reusedMap = {};
  const reusedIds = new Set();
  passwordOccurrences.forEach((items, pwd) => {
    if (items.length > 1) {
      reusedMap[pwd] = items.map(i => ({ id: i.id, site: i.site, username: i.username }));
      items.forEach(i => reusedIds.add(i.id));
    }
  });

  // 2. Identify weak passwords
  const weakIds = new Set();
  passwordList.forEach(item => {
    const pwd = item.password || '';
    const isShort = pwd.length < 10;
    const hasComplexity = /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd);
    if (isShort || !hasComplexity) {
      weakIds.add(item.id);
    }
  });

  // 3. Identify breached passwords from the scan map
  const breachedIds = new Set();
  let totalBreachOccurrences = 0;
  passwordList.forEach(item => {
    const result = breachResultsMap.get(item.password);
    if (result && result.pwned) {
      breachedIds.add(item.id);
      totalBreachOccurrences += (result.count || 1);
    }
  });

  // 4. Calculate Health Score (0 - 100)
  let score = 100;
  const breachPenalty = Math.min(breachedIds.size * 25, 50);
  score -= breachPenalty;
  const reusePenalty = Math.min(reusedIds.size * 10, 30);
  score -= reusePenalty;
  const weakPenalty = Math.min(weakIds.size * 5, 20);
  score -= weakPenalty;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let grade = 'Fortified';
  let color = 'text-emerald-600';
  let bgColor = 'bg-emerald-500';

  if (score < 50) {
    grade = 'Critical Risk';
    color = 'text-rose-600';
    bgColor = 'bg-rose-500';
  } else if (score < 75) {
    grade = 'Vulnerable';
    color = 'text-amber-600';
    bgColor = 'bg-amber-500';
  } else if (score < 90) {
    grade = 'Moderate';
    color = 'text-teal-600';
    bgColor = 'bg-teal-500';
  }

  return {
    score,
    grade,
    color,
    bgColor,
    total: passwordList.length,
    reusedCount: reusedIds.size,
    weakCount: weakIds.size,
    breachedCount: breachedIds.size,
    totalBreachOccurrences,
    reusedIds,
    weakIds,
    breachedIds,
    reusedMap,
  };
}
