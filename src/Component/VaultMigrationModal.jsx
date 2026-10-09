import { useState, useRef } from 'react';
import { toast, Bounce } from 'react-toastify';
import { exportToCSV, exportToJSONBackup, parseImportFile } from '../utils/vaultMigration';
import SiteLogo from './SiteLogo';

export default function VaultMigrationModal({
  isOpen,
  onClose,
  passwordArray = [],
  onBulkImportSuccess,
  vaultKey,
  token,
}) {
  const [activeTab, setActiveTab] = useState('import'); // 'import' | 'export'
  const [parsedPreview, setParsedPreview] = useState([]);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result;
        if (typeof content !== 'string') return;
        const parsed = parseImportFile(content, file.name, file.size);
        setParsedPreview(parsed);
        toast.success(`Found ${parsed.length} accounts in ${file.name}`, {
          theme: 'dark',
          autoClose: 2000,
        });
      } catch (err) {
        console.error('Import parse error:', err);
        toast.error(err.message || 'Failed to read file', { theme: 'dark' });
        setParsedPreview([]);
      }
    };

    reader.readAsText(file);
  };

  const handleCommitImport = async () => {
    if (!parsedPreview.length) return;
    setIsProcessing(true);

    try {
      // Filter duplicates if requested
      let candidates = parsedPreview;
      if (skipDuplicates) {
        const existingSet = new Set(
          passwordArray.map(p => `${(p.site || '').toLowerCase()}|${(p.username || '').toLowerCase()}`)
        );
        candidates = parsedPreview.filter(
          p => !existingSet.has(`${(p.site || '').toLowerCase()}|${(p.username || '').toLowerCase()}`)
        );
      }

      if (!candidates.length) {
        toast.info('All accounts in this file are already present in your vault.', { theme: 'dark' });
        setIsProcessing(false);
        return;
      }

      await onBulkImportSuccess(candidates);
      toast.success(`Successfully imported ${candidates.length} accounts!`, {
        theme: 'dark',
        transition: Bounce,
        autoClose: 2500,
      });

      setParsedPreview([]);
      setFileName('');
      onClose();
    } catch (err) {
      console.error('Import commit error:', err);
      toast.error('Failed to import accounts to vault', { theme: 'dark' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportCSV = () => {
    try {
      exportToCSV(passwordArray);
      toast.success('Plaintext CSV downloaded', { theme: 'dark', autoClose: 2000 });
    } catch (err) {
      toast.error(err.message, { theme: 'dark' });
    }
  };

  const handleExportBackup = () => {
    try {
      exportToJSONBackup(passwordArray);
      toast.success('Backup file (.json) downloaded', { theme: 'dark', autoClose: 2000 });
    } catch (err) {
      toast.error(err.message, { theme: 'dark' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f2933]/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-2xl rounded-xl border border-[#ddd8d0] bg-white p-6 shadow-2xl transition-all sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#eee9e2] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e6f2ef] text-[#176b65]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <h3 className="font-['Space_Grotesk'] text-lg font-bold text-[#1f2933]">
                Vault Migration & Backup
              </h3>
              <p className="text-xs text-[#7b746b]">
                Import from browsers or export your vault for offline backup
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[#aaa39a] hover:bg-[#f4f1ec] hover:text-[#1f2933]"
            title="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-[#f4f1ec] p-1">
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex items-center justify-center gap-2 rounded-md py-2 text-xs font-semibold transition-all ${
              activeTab === 'import'
                ? 'bg-white text-[#176b87] shadow-sm'
                : 'text-[#6f6a63] hover:text-[#1f2933]'
            }`}
          >
            <span>📥 Import Accounts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`flex items-center justify-center gap-2 rounded-md py-2 text-xs font-semibold transition-all ${
              activeTab === 'export'
                ? 'bg-white text-[#176b87] shadow-sm'
                : 'text-[#6f6a63] hover:text-[#1f2933]'
            }`}
          >
            <span>📤 Export Vault</span>
          </button>
        </div>

        {/* TAB 1: IMPORT */}
        {activeTab === 'import' && (
          <div className="mt-5 space-y-4">
            {/* Upload Box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#d5d0c8] bg-[#faf9f7] p-6 text-center transition-all hover:border-[#176b87] hover:bg-[#f0f8fa]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#176b87] shadow-sm">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-[#1f2933]">
                {fileName ? fileName : 'Click or drop a file to import'}
              </p>
              <p className="mt-1 text-[11px] text-[#7b746b]">
                Supports Google Chrome, Edge, Firefox, Bitwarden, 1Password (.csv, .json)
              </p>
            </div>

            {/* Preview Section if Parsed */}
            {parsedPreview.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#1f2933]">
                    Previewing {parsedPreview.length} accounts
                  </span>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[#6f6a63]">
                    <input
                      type="checkbox"
                      checked={skipDuplicates}
                      onChange={(e) => setSkipDuplicates(e.target.checked)}
                      className="rounded accent-[#176b87]"
                    />
                    <span>Skip already existing accounts</span>
                  </label>
                </div>

                <div className="max-h-48 overflow-y-auto rounded-lg border border-[#ddd8d0] bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-[#faf9f7] text-[10px] uppercase text-[#7b746b] border-b border-[#eee9e2]">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Service</th>
                        <th className="px-3 py-2 font-semibold">Username</th>
                        <th className="px-3 py-2 font-semibold">Password</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eee9e2]">
                      {parsedPreview.slice(0, 50).map((acc, idx) => (
                        <tr key={idx} className="hover:bg-[#faf9f7]">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <SiteLogo site={acc.site} size="sm" />
                              <span className="truncate max-w-36 font-medium text-[#1f2933]">
                                {acc.site}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-[#4b5563] truncate max-w-32">{acc.username}</td>
                          <td className="px-3 py-2 font-mono text-[11px] text-[#7b746b]">••••••••</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedPreview.length > 50 && (
                  <p className="text-[11px] text-[#7b746b] text-center">
                    + {parsedPreview.length - 50} more accounts ready to import
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleCommitImport}
                  disabled={isProcessing}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-[#176b87] py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#145d74] active:scale-[0.99] disabled:opacity-50"
                >
                  {isProcessing ? 'Encrypting & Importing...' : `Import ${parsedPreview.length} Accounts to Vault`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EXPORT */}
        {activeTab === 'export' && (
          <div className="mt-5 space-y-4">
            <p className="text-xs text-[#6f6a63]">
              Download a copy of your vault data. Currently storing <strong>{passwordArray.length} accounts</strong>.
            </p>

            {/* Option A: JSON Backup */}
            <div className="rounded-xl border border-[#d5d0c8] bg-[#faf9f7] p-4 transition-all hover:border-[#176b87]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🛡️</span>
                    <h4 className="text-xs font-bold text-[#1f2933]">JSON Vault Backup</h4>
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                      Recommended
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#7b746b]">
                    Complete backup with metadata, compatible for re-importing into PassOP anytime.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="rounded-md bg-[#176b87] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#145d74] active:scale-95"
                >
                  Download .JSON
                </button>
              </div>
            </div>

            {/* Option B: Plaintext CSV */}
            <div className="rounded-xl border border-[#ead2ce] bg-[#fff8f6] p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">⚠️</span>
                    <h4 className="text-xs font-bold text-rose-800">Plaintext CSV Export</h4>
                  </div>
                  <p className="mt-1 text-xs text-rose-700">
                    Warning: CSV files store passwords in plain, unencrypted text. Keep this file in a safe folder or delete it after importing into other apps.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="rounded-md border border-rose-300 bg-white px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 active:scale-95"
                >
                  Download .CSV
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
