import { useState, useEffect, useCallback } from 'react';
import { generatePassword, generatePassphrase, calculateEntropy } from '../utils/passphraseGenerator';

export default function PasswordGeneratorModal({ isOpen, onClose, onApplyPassword }) {
  const [mode, setMode] = useState('password'); // 'password' | 'passphrase'

  // Password options
  const [length, setLength] = useState(16);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);

  // Passphrase options
  const [wordCount, setWordCount] = useState(4);
  const [separator, setSeparator] = useState('-');
  const [capitalize, setCapitalize] = useState(true);
  const [includeNumber, setIncludeNumber] = useState(true);

  // Output & animation state
  const [generatedSecret, setGeneratedSecret] = useState('');
  const [copied, setCopied] = useState(false);
  const [isRolling, setIsRolling] = useState(false);

  // Regeneration callback
  const regenerate = useCallback(() => {
    setIsRolling(true);
    setTimeout(() => setIsRolling(false), 300);

    if (mode === 'password') {
      const pwd = generatePassword({
        length,
        uppercase,
        lowercase,
        numbers,
        symbols,
        excludeAmbiguous,
      });
      setGeneratedSecret(pwd);
    } else {
      const phrase = generatePassphrase({
        wordCount,
        separator,
        capitalize,
        includeNumber,
      });
      setGeneratedSecret(phrase);
    }
  }, [mode, length, uppercase, lowercase, numbers, symbols, excludeAmbiguous, wordCount, separator, capitalize, includeNumber]);

  // Regenerate whenever options change
  useEffect(() => {
    if (isOpen) {
      regenerate();
    }
  }, [isOpen, regenerate]);

  if (!isOpen) return null;

  // Calculate live entropy
  let charPoolSize = 0;
  if (uppercase) charPoolSize += 26;
  if (lowercase) charPoolSize += 26;
  if (numbers) charPoolSize += 10;
  if (symbols) charPoolSize += 24;

  const entropyBits = calculateEntropy({
    type: mode,
    length,
    charCount: charPoolSize,
    wordCount,
    includeNumber,
  });

  const getEntropyBadge = (bits) => {
    if (bits < 40) return { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-600', crack: 'Seconds' };
    if (bits < 60) return { label: 'Fair', color: 'bg-amber-500', text: 'text-amber-600', crack: 'Days' };
    if (bits < 80) return { label: 'Strong', color: 'bg-teal-500', text: 'text-teal-600', crack: 'Decades' };
    return { label: 'Fortified', color: 'bg-emerald-500', text: 'text-emerald-600', crack: 'Centuries' };
  };

  const entropyBadge = getEntropyBadge(entropyBits);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleApply = () => {
    if (onApplyPassword) {
      onApplyPassword(generatedSecret);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f2933]/60 p-4 backdrop-blur-sm transition-all animate-fadeIn">
      <div
        className="relative w-full max-w-lg rounded-xl border border-[#ddd8d0] bg-white p-6 shadow-2xl transition-all sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#eee9e2] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e6f2ef] text-[#176b65]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <h3 className="font-['Space_Grotesk'] text-lg font-bold text-[#1f2933]">
                Cryptographic Generator
              </h3>
              <p className="text-xs text-[#7b746b]">
                Generate high-entropy keys with browser-native randomness
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

        {/* Mode Selector Tabs */}
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-[#f4f1ec] p-1">
          <button
            type="button"
            onClick={() => setMode('password')}
            className={`flex items-center justify-center gap-2 rounded-md py-2 text-xs font-semibold transition-all ${
              mode === 'password'
                ? 'bg-white text-[#176b87] shadow-sm'
                : 'text-[#6f6a63] hover:text-[#1f2933]'
            }`}
          >
            <span className="font-mono text-sm">🔤</span>
            <span>Character Password</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('passphrase')}
            className={`flex items-center justify-center gap-2 rounded-md py-2 text-xs font-semibold transition-all ${
              mode === 'passphrase'
                ? 'bg-white text-[#176b87] shadow-sm'
                : 'text-[#6f6a63] hover:text-[#1f2933]'
            }`}
          >
            <span className="font-mono text-sm">📖</span>
            <span>Memorable Passphrase</span>
          </button>
        </div>

        {/* Secret Display Screen */}
        <div className="mt-4 rounded-lg border border-[#ddd8d0] bg-[#faf9f7] p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1 overflow-x-auto py-1 font-mono text-base font-semibold tracking-wide text-[#1f2933] select-all scrollbar-none">
              {generatedSecret}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {/* Regenerate Button */}
              <button
                type="button"
                onClick={regenerate}
                title="Roll new password"
                className="rounded-md border border-[#d5d0c8] bg-white p-2 text-[#4b5563] transition-all hover:bg-[#ebe7e1] active:scale-95"
              >
                <svg
                  className={`h-4 w-4 ${isRolling ? 'animate-spin text-[#176b87]' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>

              {/* Copy Button */}
              <button
                type="button"
                onClick={handleCopy}
                title="Copy to clipboard"
                className={`flex items-center gap-1 rounded-md border px-2.5 py-2 text-xs font-semibold transition-all active:scale-95 ${
                  copied
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-[#d5d0c8] bg-white text-[#4b5563] hover:bg-[#ebe7e1]'
                }`}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Entropy & Strength Meter */}
          <div className="mt-3 flex items-center justify-between border-t border-[#eee9e2] pt-2 text-[11px]">
            <div className="flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${entropyBadge.color}`}></span>
              <span className="font-semibold text-[#1f2933]">
                {entropyBits} bits entropy ({entropyBadge.label})
              </span>
            </div>
            <span className="text-[#7b746b]">Crack time: ~{entropyBadge.crack}</span>
          </div>
        </div>

        {/* Customization Options */}
        {mode === 'password' ? (
          <div className="mt-5 space-y-4">
            {/* Length Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-[#1f2933]">
                <span>Length: {length} characters</span>
                <div className="flex gap-1">
                  {[16, 20, 24, 32].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setLength(preset)}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        length === preset
                          ? 'bg-[#176b87] text-white'
                          : 'bg-[#eee9e2] text-[#4b5563] hover:bg-[#e2ded6]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="range"
                min="8"
                max="64"
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                className="mt-2 h-1.5 w-full cursor-pointer accent-[#176b87]"
              />
            </div>

            {/* Character Set Toggles */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex cursor-pointer items-center gap-2 rounded border border-[#e8e4de] p-2 hover:bg-[#faf9f7]">
                <input
                  type="checkbox"
                  checked={uppercase}
                  onChange={(e) => setUppercase(e.target.checked)}
                  className="rounded text-[#176b87] accent-[#176b87]"
                />
                <span className="text-[#36414b]">Uppercase (A-Z)</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 rounded border border-[#e8e4de] p-2 hover:bg-[#faf9f7]">
                <input
                  type="checkbox"
                  checked={lowercase}
                  onChange={(e) => setLowercase(e.target.checked)}
                  className="rounded text-[#176b87] accent-[#176b87]"
                />
                <span className="text-[#36414b]">Lowercase (a-z)</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 rounded border border-[#e8e4de] p-2 hover:bg-[#faf9f7]">
                <input
                  type="checkbox"
                  checked={numbers}
                  onChange={(e) => setNumbers(e.target.checked)}
                  className="rounded text-[#176b87] accent-[#176b87]"
                />
                <span className="text-[#36414b]">Numbers (0-9)</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 rounded border border-[#e8e4de] p-2 hover:bg-[#faf9f7]">
                <input
                  type="checkbox"
                  checked={symbols}
                  onChange={(e) => setSymbols(e.target.checked)}
                  className="rounded text-[#176b87] accent-[#176b87]"
                />
                <span className="text-[#36414b]">Symbols (!@#$...)</span>
              </label>
            </div>

            {/* Avoid Look-alikes */}
            <label className="flex cursor-pointer items-center gap-2 text-xs text-[#6f6a63]">
              <input
                type="checkbox"
                checked={excludeAmbiguous}
                onChange={(e) => setExcludeAmbiguous(e.target.checked)}
                className="rounded text-[#176b87] accent-[#176b87]"
              />
              <span>Avoid look-alikes (exclude 0, O, 1, l, I)</span>
            </label>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {/* Word Count Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-[#1f2933]">
                <span>Word count: {wordCount} words</span>
                <div className="flex gap-1">
                  {[3, 4, 5, 6].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setWordCount(count)}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        wordCount === count
                          ? 'bg-[#176b87] text-white'
                          : 'bg-[#eee9e2] text-[#4b5563] hover:bg-[#e2ded6]'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="range"
                min="3"
                max="8"
                value={wordCount}
                onChange={(e) => setWordCount(Number(e.target.value))}
                className="mt-2 h-1.5 w-full cursor-pointer accent-[#176b87]"
              />
            </div>

            {/* Separator Selection */}
            <div>
              <span className="text-xs font-semibold text-[#1f2933]">Word Separator:</span>
              <div className="mt-1.5 flex gap-2">
                {[
                  { label: 'Hyphen (-)', val: '-' },
                  { label: 'Underscore (_)', val: '_' },
                  { label: 'Dot (.)', val: '.' },
                  { label: 'Space ( )', val: ' ' },
                ].map((sep) => (
                  <button
                    key={sep.val}
                    type="button"
                    onClick={() => setSeparator(sep.val)}
                    className={`rounded border px-2.5 py-1 text-xs font-semibold transition-all ${
                      separator === sep.val
                        ? 'border-[#176b87] bg-[#f0f8fa] text-[#176b87]'
                        : 'border-[#ddd8d0] bg-white text-[#4b5563] hover:bg-[#f4f1ec]'
                    }`}
                  >
                    {sep.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Passphrase Toggles */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex cursor-pointer items-center gap-2 rounded border border-[#e8e4de] p-2 hover:bg-[#faf9f7]">
                <input
                  type="checkbox"
                  checked={capitalize}
                  onChange={(e) => setCapitalize(e.target.checked)}
                  className="rounded text-[#176b87] accent-[#176b87]"
                />
                <span className="text-[#36414b]">Capitalize Words</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 rounded border border-[#e8e4de] p-2 hover:bg-[#faf9f7]">
                <input
                  type="checkbox"
                  checked={includeNumber}
                  onChange={(e) => setIncludeNumber(e.target.checked)}
                  className="rounded text-[#176b87] accent-[#176b87]"
                />
                <span className="text-[#36414b]">Include Number</span>
              </label>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#eee9e2] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#d5d0c8] px-4 py-2 text-xs font-semibold text-[#4b5563] hover:bg-[#f4f1ec]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-2 rounded-md bg-[#176b87] px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#145d74] active:scale-95"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Use This Secret</span>
          </button>
        </div>
      </div>
    </div>
  );
}
