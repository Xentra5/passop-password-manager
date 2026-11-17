/**
 * PassVault Content Script — Auto-Fill Engine
 *
 * Injected into every page. Responsibilities:
 *  1. Detect login forms (password + username fields)
 *  2. Notify background service worker that a login form exists
 *  3. Listen for FILL_CREDENTIALS message and populate form fields
 *  4. Dispatch synthetic events so React/Vue/Angular forms react properly
 */

'use strict';

// ─── State ────────────────────────────────────────────────────────────────────

let _formDetected = false;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Find a password field. Prioritise visible fields.
 */
function findPasswordField() {
  const all = Array.from(document.querySelectorAll('input[type="password"]'));
  return all.find((el) => el.offsetParent !== null) || all[0] || null;
}

/**
 * Walk backwards from a password field to find the most likely username/email input.
 * Strategy: scan all inputs before the password field in DOM order.
 */
function findUsernameField(pwField) {
  if (!pwField) return null;

  // Gather all inputs in document order
  const inputs = Array.from(
    document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input:not([type])')
  );

  // Filter to those that appear before the password field in DOM
  const before = inputs.filter((el) => {
    if (el === pwField) return false;
    const pos = el.compareDocumentPosition(pwField);
    return pos & Node.DOCUMENT_POSITION_FOLLOWING; // pwField comes after el
  });

  if (before.length === 0) return null;

  // Prefer last one (usually the one right above password)
  return before[before.length - 1];
}

/**
 * Dispatch native + React synthetic events on a changed input so frameworks detect it.
 */
function nativeInputValueSetter(element, value) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(element, value);
  } else {
    element.value = value;
  }

  // Fire events that React/Vue/Angular listen to
  ['input', 'change', 'keyup', 'keydown', 'blur'].forEach((evtName) => {
    element.dispatchEvent(new Event(evtName, { bubbles: true }));
  });
}

/**
 * Detect login form on page, return field references.
 */
function detectLoginForm() {
  const pwField = findPasswordField();
  if (!pwField) return null;

  const userField = findUsernameField(pwField);
  return { pwField, userField };
}

// ─── Form Detection & Notification ───────────────────────────────────────────

function notifyBackgroundIfForm() {
  const fields = detectLoginForm();
  if (!fields || _formDetected) return;

  _formDetected = true;

  chrome.runtime.sendMessage({
    action: 'PAGE_HAS_LOGIN_FORM',
    url: window.location.href,
  }).catch(() => {
    // Background may not be ready yet — ignore
  });
}

// Run immediately and again after a short delay (SPAs load forms late)
notifyBackgroundIfForm();
setTimeout(notifyBackgroundIfForm, 1500);
setTimeout(notifyBackgroundIfForm, 3000);

// Also watch for DOM mutations (SPA navigation)
const _observer = new MutationObserver(() => {
  if (!_formDetected) notifyBackgroundIfForm();
});
_observer.observe(document.body || document.documentElement, {
  childList: true,
  subtree: true,
});

// ─── Message Listener ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action !== 'FILL_CREDENTIALS') {
    return false;
  }

  const { username, password } = message;

  // Re-detect in case DOM changed since page load
  const fields = detectLoginForm();
  if (!fields) {
    sendResponse({ success: false, error: 'No login form found on page' });
    return true;
  }

  const { pwField, userField } = fields;

  try {
    // Fill password
    pwField.focus();
    nativeInputValueSetter(pwField, password);

    // Fill username/email if field found
    if (userField && username) {
      userField.focus();
      nativeInputValueSetter(userField, username);
    }

    // Return focus to password field
    pwField.focus();

    sendResponse({ success: true });
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }

  return true; // Keep channel open for async sendResponse
});
