/**
 * Anti-CSRF Protection Client Utility
 * Implements the Double-Submit Cookie Pattern for SPA (Single Page Application).
 *
 * HOW IT WORKS:
 * 1. Safe methods (GET, HEAD, OPTIONS) do not require CSRF headers.
 * 2. Unsafe methods (POST, PUT, DELETE, PATCH) automatically attach the
 *    'X-CSRF-Token' header matching the server's 'XSRF-TOKEN' cookie.
 * 3. Even if a malicious site initiates a forged request, it cannot read
 *    cookies or headers from our origin, so the CSRF token cannot be forged.
 */

const AUTH_URL = import.meta.env.VITE_AUTH_API_URL ?? 'http://localhost:3000/api/auth';
// Base API URL (e.g., http://localhost:3000/api)
const API_BASE = AUTH_URL.replace(/\/auth\/?$/, '');

let memoryCsrfToken = null;
let fetchingPromise = null;

/**
 * Extracts a cookie value by name from document.cookie.
 * @param {string} name
 * @returns {string|null}
 */
export function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Manually sets or caches the active CSRF token in memory.
 * @param {string} token
 */
export function setCsrfToken(token) {
  if (typeof token === 'string' && token.trim().length > 0) {
    memoryCsrfToken = token.trim();
  }
}

/**
 * Retrieves the current CSRF token from memory, document.cookie,
 * or fetches a fresh one from the backend /api/csrf-token endpoint.
 * @param {boolean} forceRefresh - If true, ignores cache and requests fresh token
 * @returns {Promise<string>}
 */
export async function getCsrfToken(forceRefresh = false) {
  if (!forceRefresh) {
    // 1. Check in-memory token first
    if (memoryCsrfToken) return memoryCsrfToken;

    // 2. Check XSRF-TOKEN cookie in browser
    const cookieToken = getCookie('XSRF-TOKEN');
    if (cookieToken) {
      memoryCsrfToken = cookieToken;
      return cookieToken;
    }
  }

  // 3. Avoid duplicate concurrent fetch requests
  if (fetchingPromise) {
    return fetchingPromise;
  }

  fetchingPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}/csrf-token`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.csrfToken) {
          memoryCsrfToken = data.csrfToken;
          return data.csrfToken;
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[DEV] Failed to fetch CSRF token:', err.message);
      }
    } finally {
      fetchingPromise = null;
    }

    return memoryCsrfToken || getCookie('XSRF-TOKEN') || '';
  })();

  return fetchingPromise;
}

/**
 * Drop-in wrapper around native `fetch` that automatically enforces:
 * 1. credentials: 'include' (for HttpOnly session & CSRF cookies)
 * 2. X-CSRF-Token header on state-modifying requests (POST, PUT, DELETE, PATCH)
 * 3. Automatic single-retry if CSRF token expired or refreshed
 *
 * @param {string} url
 * @param {RequestInit} options
 * @returns {Promise<Response>}
 */
export async function secureFetch(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const isStateModifying = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

  const mergedHeaders = new Headers(options.headers || {});

  // If modifying state, attach the Double-Submit anti-CSRF token
  if (isStateModifying) {
    let token = await getCsrfToken();
    if (token) {
      mergedHeaders.set('X-CSRF-Token', token);
    }
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Always send and accept cookies
    headers: mergedHeaders,
  });

  // If server returns 403 with CSRF error, refresh token once and retry
  if (response.status === 403 && isStateModifying) {
    try {
      const clone = response.clone();
      const data = await clone.json();
      if (data?.code === 'CSRF_INVALID' || data?.code === 'CSRF_MISSING') {
        const freshToken = await getCsrfToken(true);
        if (freshToken) {
          mergedHeaders.set('X-CSRF-Token', freshToken);
          return await fetch(url, {
            ...options,
            credentials: 'include',
            headers: mergedHeaders,
          });
        }
      }
    } catch {
      // Return original response if not JSON
    }
  }

  return response;
}
