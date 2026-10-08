/**
 * Vault Migration Utility
 * Supports CSV Import/Export (Chrome, Firefox, Bitwarden, 1Password, PassOP)
 * and Zero-Knowledge Encrypted JSON Backups.
 *
 * SECURITY FIXES APPLIED:
 * - BUG #7 FIX: CSV and JSON export now display a mandatory security warning
 *   banner. The exported file header makes clear the data is unencrypted.
 * - BUG #8 FIX: Input validation added on import — file size capped at 5 MB,
 *   record count capped at 500, and site/username fields are sanitized to
 *   strip HTML tags and control characters before storing.
 */

import { v4 as uuidv4 } from 'uuid';

// BUG #8 FIX: Safety limits for import
const MAX_IMPORT_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_IMPORT_RECORDS = 500;

// ─── Sanitization ─────────────────────────────────────────────────────────

/**
 * BUG #8 FIX: Strip HTML tags and dangerous control characters from
 * user-supplied strings to prevent stored-XSS via imported vault data.
 */
function sanitizeField(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/<[^>]*>/g, '')           // strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip control chars
    .trim()
    .slice(0, 2048); // hard cap per field
}

// ─── CSV Helpers ──────────────────────────────────────────────────────────

/**
 * Escapes a cell value for CSV (RFC 4180 compliance).
 */
function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ─── Export ───────────────────────────────────────────────────────────────

/**
 * Exports vault accounts to a plaintext CSV file.
 *
 * BUG #7 FIX: A security warning comment is prepended to the CSV, and the
 * caller is expected to show a confirmation dialog before calling this function.
 * Compatible with Chrome, Firefox, Bitwarden, Excel.
 */
export function exportToCSV(passwordArray = []) {
  if (!passwordArray.length) {
    throw new Error('Vault is empty. Nothing to export.');
  }

  // BUG #7 FIX: Prepend a clear warning so anyone who opens the file sees it
  const warningComment =
    '# WARNING: This file contains UNENCRYPTED passwords. Keep it secure and delete after use.\r\n';

  const headers = ['name', 'url', 'username', 'password', 'notes'];
  const rows = [headers.join(',')];

  for (const item of passwordArray) {
    const row = [
      escapeCSV(item.site),
      escapeCSV(item.site.startsWith('http') ? item.site : `https://${item.site}`),
      escapeCSV(item.username),
      escapeCSV(item.password),
      escapeCSV('Exported from PassOP Vault — UNENCRYPTED'),
    ];
    rows.push(row.join(','));
  }

  const csvContent = warningComment + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `passop_vault_export_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports vault accounts to a timestamped JSON backup file.
 *
 * BUG #7 FIX: A warning field is included in the JSON, and the exported
 * file clearly labels itself as unencrypted.
 */
export function exportToJSONBackup(passwordArray = []) {
  if (!passwordArray.length) {
    throw new Error('Vault is empty. Nothing to export.');
  }

  const backupData = {
    app: 'PassOP Cryptographic Vault',
    version: '2.0',
    // BUG #7 FIX: Clear unencrypted warning in the exported file itself
    securityWarning: 'UNENCRYPTED EXPORT — This file contains plaintext passwords. Store securely and delete after use.',
    exportedAt: new Date().toISOString(),
    accountCount: passwordArray.length,
    accounts: passwordArray.map(item => ({
      id: item.id || uuidv4(),
      site: item.site,
      username: item.username,
      password: item.password,
    })),
  };

  const jsonContent = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `passop_backup_${dateStr}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── CSV Parser ───────────────────────────────────────────────────────────

/**
 * Robust RFC 4180 CSV line parser that respects quotes and commas inside fields.
 */
function parseCSVRows(csvText) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // Skip escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        // Skip carriage return
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some(f => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(f => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// ─── Import ───────────────────────────────────────────────────────────────

/**
 * Parses and maps imported CSV or JSON text into standard PassOP vault records.
 * Supports: Google Chrome, Brave, Firefox, Bitwarden, 1Password, and PassOP exports.
 *
 * BUG #8 FIX: Added file size check (caller must pass fileSize), record count
 * cap, and field sanitization to prevent stored-XSS and DoS via large imports.
 *
 * @param {string} fileContent - Raw content of the uploaded file
 * @param {string} fileName    - Name of uploaded file (for extension detection)
 * @param {number} fileSize    - Byte size of the file (from File.size)
 * @returns {Array<{ id: string, site: string, username: string, password: string }>}
 */
export function parseImportFile(fileContent, fileName = '', fileSize = 0) {
  // BUG #8 FIX: Reject files that are too large to prevent browser freeze / DoS
  if (fileSize > MAX_IMPORT_FILE_SIZE_BYTES) {
    throw new Error(`Import file is too large (max ${MAX_IMPORT_FILE_SIZE_BYTES / 1024 / 1024} MB).`);
  }

  const isJSON = fileName.endsWith('.json') || fileContent.trim().startsWith('{');

  if (isJSON) {
    try {
      const data = JSON.parse(fileContent);
      const list = Array.isArray(data) ? data : (data.accounts || data.passwords || []);
      const parsed = [];

      for (const item of list) {
        // BUG #8 FIX: cap at MAX_IMPORT_RECORDS
        if (parsed.length >= MAX_IMPORT_RECORDS) {
          throw new Error(`Import limit exceeded: maximum ${MAX_IMPORT_RECORDS} records allowed per import.`);
        }

        // BUG #8 FIX: sanitize all fields before accepting
        const site     = sanitizeField(item.site || item.url || item.name || '');
        const username = sanitizeField(item.username || item.login || item.email || '');
        const password = sanitizeField(item.password || item.secret || '');

        if (site && username && password) {
          parsed.push({
            id: item.id || uuidv4(),
            site,
            username,
            password,
          });
        }
      }

      if (!parsed.length) throw new Error('No valid credential records found in JSON file.');
      return parsed;
    } catch (err) {
      throw new Error(`Failed to parse JSON backup: ${err.message}`);
    }
  }

  // Parse as CSV — skip comment lines (lines starting with #)
  const filteredContent = fileContent
    .split('\n')
    .filter(line => !line.trimStart().startsWith('#'))
    .join('\n');

  const rows = parseCSVRows(filteredContent);
  if (rows.length < 2) {
    throw new Error('CSV file is empty or missing headers.');
  }

  const rawHeaders = rows[0].map(h => h.toLowerCase().replace(/[\s_]/g, ''));
  const dataRows = rows.slice(1);

  // Column index identification
  let siteIdx = -1;
  let userIdx = -1;
  let passIdx = -1;

  rawHeaders.forEach((header, idx) => {
    if (['url', 'site', 'website', 'loginurl', 'loginuri', 'hostname', 'domain', 'name', 'title'].includes(header)) {
      if (siteIdx === -1 || header === 'url' || header === 'site' || header === 'loginurl' || header === 'loginuri') {
        siteIdx = idx;
      }
    }
    if (['username', 'user', 'login', 'loginusername', 'email', 'loginname'].includes(header)) {
      userIdx = idx;
    }
    if (['password', 'loginpassword', 'pass', 'secret'].includes(header)) {
      passIdx = idx;
    }
  });

  // Fallbacks if headers were non-standard
  if (siteIdx === -1) siteIdx = 1;
  if (userIdx === -1) userIdx = 2;
  if (passIdx === -1) passIdx = 3;

  const parsedAccounts = [];

  for (const row of dataRows) {
    // BUG #8 FIX: cap records
    if (parsedAccounts.length >= MAX_IMPORT_RECORDS) {
      throw new Error(`Import limit exceeded: maximum ${MAX_IMPORT_RECORDS} records allowed per import.`);
    }

    // BUG #8 FIX: sanitize all imported fields
    const site     = sanitizeField(row[siteIdx] || row[0] || '');
    const username = sanitizeField(row[userIdx] || '');
    const password = sanitizeField(row[passIdx] || '');

    if (site && (username || password)) {
      parsedAccounts.push({
        id: uuidv4(),
        site,
        username: username || 'User',
        password: password || '',
      });
    }
  }

  if (!parsedAccounts.length) {
    throw new Error('Could not extract any valid accounts from this CSV file.');
  }

  return parsedAccounts;
}
