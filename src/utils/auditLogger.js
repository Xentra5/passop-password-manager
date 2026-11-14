/**
 * Vault Security & Access Audit Logger
 * Maintains a local, chronological security audit trail of sensitive actions
 * such as PIN/master password unlocks, failed attempts, clipboard copies,
 * and vault exports/modifications.
 */

const AUDIT_STORAGE_PREFIX = 'passvault_audit_events_';
const MAX_AUDIT_EVENTS = 100;

export const AUDIT_CATEGORIES = {
  ALL: 'all',
  AUTH: 'auth',
  CLIPBOARD: 'clipboard',
  VAULT: 'vault',
  SECURITY: 'security',
};

export const AUDIT_EVENT_TYPES = {
  UNLOCK_PIN: 'UNLOCK_PIN',
  UNLOCK_MASTER: 'UNLOCK_MASTER',
  LOCK_VAULT: 'LOCK_VAULT',
  FAILED_PIN: 'FAILED_PIN',
  FAILED_MASTER: 'FAILED_MASTER',
  LOCKOUT_TRIGGERED: 'LOCKOUT_TRIGGERED',
  COPY_PASSWORD: 'COPY_PASSWORD',
  COPY_USERNAME: 'COPY_USERNAME',
  EXPORT_VAULT: 'EXPORT_VAULT',
  IMPORT_VAULT: 'IMPORT_VAULT',
  CREDENTIAL_CREATE: 'CREDENTIAL_CREATE',
  CREDENTIAL_UPDATE: 'CREDENTIAL_UPDATE',
  CREDENTIAL_DELETE: 'CREDENTIAL_DELETE',
};

function getStorageKey(userEmail) {
  const normalized = (userEmail || 'default_user').trim().toLowerCase();
  return `${AUDIT_STORAGE_PREFIX}${normalized}`;
}

/**
 * Appends a new security event to the audit trail.
 */
export function logAuditEvent(userEmail, {
  type,
  title,
  description,
  severity = 'info', // 'info' | 'success' | 'warning' | 'danger'
  category = 'vault', // 'auth' | 'clipboard' | 'vault' | 'security'
  metadata = null,
}) {
  try {
    const key = getStorageKey(userEmail);
    const existingRaw = localStorage.getItem(key);
    let events = [];
    if (existingRaw) {
      try {
        const parsed = JSON.parse(existingRaw);
        if (Array.isArray(parsed)) events = parsed;
      } catch {
        events = [];
      }
    }

    const newEvent = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      title: title || type,
      description: description || '',
      severity,
      category,
      timestamp: Date.now(),
      metadata,
    };

    // Prepend latest event, cap at MAX_AUDIT_EVENTS
    const updated = [newEvent, ...events].slice(0, MAX_AUDIT_EVENTS);
    localStorage.setItem(key, JSON.stringify(updated));

    // Notify active listeners for real-time drawer updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('passvault:audit_event', { detail: newEvent }));
    }

    return newEvent;
  } catch (err) {
    console.warn('Could not record audit log event:', err);
    return null;
  }
}

/**
 * Returns audit log events for the given user, optionally filtered by category.
 */
export function getAuditEvents(userEmail, category = 'all') {
  try {
    const key = getStorageKey(userEmail);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    if (category === 'all') return list;
    return list.filter((event) => event.category === category);
  } catch {
    return [];
  }
}

/**
 * Clears all audit log events for a given user.
 */
export function clearAuditEvents(userEmail) {
  try {
    const key = getStorageKey(userEmail);
    localStorage.removeItem(key);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('passvault:audit_event', { detail: { cleared: true } }));
    }
  } catch (err) {
    console.warn('Failed to clear audit log:', err);
  }
}

/**
 * Exports the user's audit log as a JSON file.
 */
export function exportAuditLogJSON(userEmail) {
  try {
    const events = getAuditEvents(userEmail, 'all');
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `passvault-audit-log-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (err) {
    console.error('Failed to export audit log JSON:', err);
  }
}

/**
 * Helper to format timestamp into readable relative time (e.g. "Just now", "5m ago", "Yesterday").
 */
export function formatAuditTime(timestamp) {
  if (!timestamp) return 'Unknown';
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);

  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

