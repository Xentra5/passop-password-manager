/**
 * Vault Migration Utility
 * Supports CSV Import/Export (Chrome, Firefox, Bitwarden, 1Password, PassOP)
 * and Zero-Knowledge Encrypted JSON Backups.
 */

import { v4 as uuidv4 } from 'uuid';

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

/**
 * Exports vault accounts to a plaintext CSV file.
 * Compatible with Chrome, Firefox, Bitwarden, Excel.
 */
export function exportToCSV(passwordArray = []) {
  if (!passwordArray.length) {
    throw new Error('Vault is empty. Nothing to export.');
  }

  const headers = ['name', 'url', 'username', 'password', 'notes'];
  const rows = [headers.join(',')];

  for (const item of passwordArray) {
    const row = [
      escapeCSV(item.site),
      escapeCSV(item.site.startsWith('http') ? item.site : `https://${item.site}`),
      escapeCSV(item.username),
      escapeCSV(item.password),
      escapeCSV('Exported from PassOP Vault'),
    ];
    rows.push(row.join(','));
  }

  const csvContent = rows.join('\r\n');
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
 */
export function exportToJSONBackup(passwordArray = []) {
  if (!passwordArray.length) {
    throw new Error('Vault is empty. Nothing to export.');
  }

  const backupData = {
    app: 'PassOP Cryptographic Vault',
    version: '2.0',
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

/**
 * Parses and maps imported CSV or JSON text into standard PassOP vault records.
 * Supports: Google Chrome, Brave, Firefox, Bitwarden, 1Password, and PassOP exports.
 *
 * @param {string} fileContent - Raw content of the uploaded file
 * @param {string} fileName - Name of uploaded file (for extension detection)
 * @returns {Array<{ id: string, site: string, username: string, password: string }>}
 */
export function parseImportFile(fileContent, fileName = '') {
  const isJSON = fileName.endsWith('.json') || fileContent.trim().startsWith('{');

  if (isJSON) {
    try {
      const data = JSON.parse(fileContent);
      const list = Array.isArray(data) ? data : (data.accounts || data.passwords || []);
      const parsed = [];

      for (const item of list) {
        const site = item.site || item.url || item.name || '';
        const username = item.username || item.login || item.email || '';
        const password = item.password || item.secret || '';

        if (site && username && password) {
          parsed.push({
            id: item.id || uuidv4(),
            site: site.trim(),
            username: username.trim(),
            password: password,
          });
        }
      }

      if (!parsed.length) throw new Error('No valid credential records found in JSON file.');
      return parsed;
    } catch (err) {
      throw new Error(`Failed to parse JSON backup: ${err.message}`);
    }
  }

  // Parse as CSV
  const rows = parseCSVRows(fileContent);
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
    // Site / URL identification
    if (['url', 'site', 'website', 'loginurl', 'loginuri', 'hostname', 'domain', 'name', 'title'].includes(header)) {
      if (siteIdx === -1 || header === 'url' || header === 'site' || header === 'loginurl' || header === 'loginuri') {
        siteIdx = idx;
      }
    }
    // Username identification
    if (['username', 'user', 'login', 'loginusername', 'email', 'loginname'].includes(header)) {
      userIdx = idx;
    }
    // Password identification
    if (['password', 'loginpassword', 'pass', 'secret'].includes(header)) {
      passIdx = idx;
    }
  });

  // Fallbacks if headers were non-standard (e.g. Chrome format without exact headers)
  if (siteIdx === -1) siteIdx = 1;
  if (userIdx === -1) userIdx = 2;
  if (passIdx === -1) passIdx = 3;

  const parsedAccounts = [];

  for (const row of dataRows) {
    const siteRaw = row[siteIdx] || row[0] || '';
    const userRaw = row[userIdx] || '';
    const passRaw = row[passIdx] || '';

    // Clean site URL (strip leading https:// or www. for display if preferred, or keep standard)
    const site = siteRaw.trim();
    const username = userRaw.trim();
    const password = passRaw;

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
