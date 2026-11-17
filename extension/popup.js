/**
 * PassVault Extension Popup — Controller
 *
 * Handles all UI logic for the extension popup:
 *  - Auth state detection (shows login or vault screen)
 *  - Login form with master password entry
 *  - Credential fetching filtered to current tab's domain
 *  - Autofill trigger to content script via background service worker
 *  - Search/filter credentials inline
 */

'use strict';

// ─── DOM Refs ─────────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

const screens = {
  loading: $('screen-loading'),
  login: $('screen-login'),
  vault: $('screen-vault'),
};

// ─── State ────────────────────────────────────────────────────────────────────

let _currentTabId = null;
let _currentTabUrl = null;
let _allCredentials = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function showScreen(name) {
  Object.values(screens).forEach((el) => el.classList.remove('active'));
  screens[name].classList.add('active');
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url || '';
  }
}

function getFaviconUrl(tabUrl) {
  try {
    const origin = new URL(tabUrl).origin;
    return `${origin}/favicon.ico`;
  } catch {
    return '';
  }
}

function showLoginError(msg) {
  const el = $('login-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideLoginError() {
  $('login-error').classList.add('hidden');
}

function setLoginLoading(loading) {
  const btn = $('btn-login');
  const text = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.btn-spinner');
  btn.disabled = loading;
  text.textContent = loading ? 'Unlocking…' : 'Unlock Vault';
  spinner.classList.toggle('hidden', !loading);
}

function showToast(msg, isError = false) {
  const toast = $('fill-toast');
  const text = $('fill-toast-text');
  text.textContent = msg;
  toast.classList.toggle('toast-error', isError);
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2500);
}

// ─── Render Credentials ───────────────────────────────────────────────────────

function renderCredentials(credentials) {
  const list = $('credentials-list');
  const empty = $('credentials-empty');
  const errorEl = $('credentials-error');

  list.innerHTML = '';
  errorEl.classList.add('hidden');

  if (!credentials || credentials.length === 0) {
    empty.classList.remove('hidden');
    list.classList.add('hidden');
    return;
  }

  empty.classList.add('hidden');
  list.classList.remove('hidden');

  credentials.forEach((cred) => {
    const li = document.createElement('li');
    li.className = 'cred-item';
    li.dataset.credId = cred.id;

    // Favicon letter avatar
    const letter = (cred.site?.[0] || cred.username?.[0] || '?').toUpperCase();
    const tagColors = {
      work: '#3b82f6',
      personal: '#8b5cf6',
      finance: '#f59e0b',
      social: '#ec4899',
    };
    const avatarColor = tagColors[cred.tag] || '#10b981';

    li.innerHTML = `
      <div class="cred-avatar" style="background:${avatarColor}22;color:${avatarColor}">${letter}</div>
      <div class="cred-info">
        <span class="cred-site">${escapeHtml(cred.site || '')}</span>
        <span class="cred-user">${escapeHtml(cred.username || '')}</span>
      </div>
      <div class="cred-actions">
        <button class="cred-btn cred-copy" title="Copy password" data-id="${cred.id}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor"/>
          </svg>
        </button>
        <button class="cred-btn cred-fill btn-fill-primary" title="Auto-fill" data-id="${cred.id}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
          </svg>
          Fill
        </button>
      </div>
    `;

    list.appendChild(li);
  });

  // Event delegation
  list.onclick = (e) => {
    const fillBtn = e.target.closest('.cred-fill');
    const copyBtn = e.target.closest('.cred-copy');

    if (fillBtn) {
      const cred = credentials.find((c) => c.id === fillBtn.dataset.id);
      if (cred) handleFill(cred);
    }

    if (copyBtn) {
      const cred = credentials.find((c) => c.id === copyBtn.dataset.id);
      if (cred) handleCopy(cred);
    }
  };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Fill / Copy Handlers ─────────────────────────────────────────────────────

async function handleFill(cred) {
  if (!_currentTabId) {
    showToast('No active tab found', true);
    return;
  }

  const result = await chrome.runtime.sendMessage({
    action: 'FILL_FORM',
    tabId: _currentTabId,
    username: cred.username,
    password: cred.password,
  });

  if (result?.success) {
    showToast(`Filled ${cred.site}`);
  } else {
    showToast(result?.error || 'Fill failed — no form found', true);
  }
}

async function handleCopy(cred) {
  try {
    await navigator.clipboard.writeText(cred.password);
    showToast('Password copied!');
  } catch {
    showToast('Clipboard write blocked', true);
  }
}

// ─── Load Credentials ─────────────────────────────────────────────────────────

async function loadCredentials(tabUrl) {
  const loadingEl = $('credentials-loading');
  const listEl = $('credentials-list');
  const emptyEl = $('credentials-empty');
  const errorEl = $('credentials-error');

  loadingEl.classList.remove('hidden');
  listEl.classList.add('hidden');
  emptyEl.classList.add('hidden');
  errorEl.classList.add('hidden');

  const result = await chrome.runtime.sendMessage({
    action: 'GET_CREDENTIALS',
    tabUrl,
  });

  loadingEl.classList.add('hidden');

  if (!result.success) {
    if (result.locked) {
      // Session expired — go back to login
      showScreen('login');
      return;
    }
    errorEl.classList.remove('hidden');
    $('credentials-error-text').textContent = result.error || 'Failed to fetch credentials';
    return;
  }

  _allCredentials = result.credentials || [];

  // Update empty message based on context
  const domain = extractDomain(tabUrl);
  $('empty-msg').textContent = domain
    ? `No credentials saved for "${domain}"`
    : 'No credentials in vault';

  renderCredentials(_allCredentials);
}

// ─── Search ───────────────────────────────────────────────────────────────────

function handleSearch(query) {
  if (!query.trim()) {
    renderCredentials(_allCredentials);
    return;
  }

  const q = query.toLowerCase();
  const filtered = _allCredentials.filter(
    (c) =>
      c.site?.toLowerCase().includes(q) ||
      c.username?.toLowerCase().includes(q) ||
      c.tag?.toLowerCase().includes(q)
  );
  renderCredentials(filtered);
}

// ─── Login Handler ────────────────────────────────────────────────────────────

async function handleLogin(e) {
  e.preventDefault();
  hideLoginError();

  const email = $('login-email').value.trim();
  const password = $('login-password').value;

  if (!email || !password) {
    showLoginError('Email and master password are required.');
    return;
  }

  setLoginLoading(true);

  const result = await chrome.runtime.sendMessage({ action: 'LOGIN', email, password });

  setLoginLoading(false);

  if (!result.success) {
    showLoginError(result.error || 'Login failed. Check your credentials.');
    return;
  }

  // Switch to vault screen
  await showVaultScreen(result.user);
}

// ─── Vault Screen Setup ───────────────────────────────────────────────────────

async function showVaultScreen(user) {
  showScreen('vault');

  // Show user info
  if (user?.email) {
    $('user-email-display').textContent = user.email;
  }

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  _currentTabId = tab?.id || null;
  _currentTabUrl = tab?.url || null;

  const domain = _currentTabUrl ? extractDomain(_currentTabUrl) : null;
  $('tab-domain').textContent = domain || 'Unknown site';

  // Try to show favicon
  if (_currentTabUrl) {
    const faviconEl = $('tab-favicon');
    const faviconUrl = getFaviconUrl(_currentTabUrl);
    const img = document.createElement('img');
    img.src = faviconUrl;
    img.width = 16;
    img.height = 16;
    img.onerror = () => {
      faviconEl.innerHTML = `<div class="favicon-fallback">${(domain?.[0] || '?').toUpperCase()}</div>`;
    };
    faviconEl.innerHTML = '';
    faviconEl.appendChild(img);
  }

  // Load credentials for current tab
  await loadCredentials(_currentTabUrl);
}

// ─── Initialise ───────────────────────────────────────────────────────────────

async function init() {
  showScreen('loading');

  // Check if vault is already unlocked (service worker session persists across popup opens)
  const lockState = await chrome.runtime.sendMessage({ action: 'CHECK_VAULT_LOCKED' });

  if (!lockState.locked) {
    // Verify backend session still valid
    const authState = await chrome.runtime.sendMessage({ action: 'GET_AUTH_STATE' });
    if (authState.loggedIn) {
      await showVaultScreen(authState.user || lockState.userInfo);
      return;
    }
  }

  showScreen('login');
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Login form
  $('btn-login').addEventListener('click', handleLogin);
  $('login-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin(e);
  });
  $('login-email').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('login-password').focus();
  });

  // Password toggle
  document.querySelectorAll('.toggle-pw').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      target.type = target.type === 'password' ? 'text' : 'password';
    });
  });

  // Lock button
  $('btn-lock').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ action: 'LOGOUT' });
    _allCredentials = [];
    _currentTabId = null;
    _currentTabUrl = null;
    showScreen('login');
  });

  // Search
  $('search-input').addEventListener('input', (e) => handleSearch(e.target.value));

  // Run init
  init();
});
