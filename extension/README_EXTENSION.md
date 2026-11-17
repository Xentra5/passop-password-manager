# PassVault Browser Extension

**Manifest V3** Chrome/Edge extension that auto-fills credentials from your PassVault on any website.

---

## 🚀 How to Load the Extension

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the folder:
   ```
   d:\PracticeReact\PasswordProject\PasswordProject\extension\
   ```
5. The **PassVault** extension icon appears in your toolbar

> **Edge**: Go to `edge://extensions` → same steps.

---

## 🔐 How to Use

1. **Start your PassVault backend**: `cd backend && node server.js` (port 3000)
2. Click the PassVault icon in your browser toolbar
3. Enter your **email** and **master password** — same credentials as the app
4. Navigate to any website where you have saved credentials
5. Click **Fill** next to the matching credential to auto-fill the login form

---

## 🏗️ Architecture

```
extension/
├── manifest.json        Manifest V3 — permissions, host_permissions, CSP
├── background.js        Service Worker — auth, crypto, vault key management
├── content.js           Page Script — form detection, field filling
├── popup.html/js/css    Extension popup UI
└── icons/               16×16 to 128×128 PNG icons
```

### Data Flow

```
Popup UI  →  background.js (service worker)  →  PassVault API (localhost:3000)
                    ↓
            Decrypt passwords client-side (AES-256-GCM)
                    ↓
Popup UI  →  FILL_FORM message  →  background.js  →  content.js  →  page form
```

### Security Model

| Property | Detail |
|---|---|
| **Zero-knowledge** | Passwords decrypted in service worker, never sent to backend in plaintext |
| **Vault key storage** | Raw AES-256 key bytes in `chrome.storage.session` — auto-cleared on browser close |
| **Session isolation** | `chrome.storage.session` is not accessible to web pages or other extensions |
| **Auth** | HttpOnly JWT cookie from PassVault backend — extension never touches the token directly |
| **CSRF** | Double-submit cookie pattern — CSRF token fetched and attached to all POST requests |
| **CSP** | `script-src 'self'` — no inline scripts, no remote scripts |
| **Key derivation** | PBKDF2 600,000 iterations SHA-256 — matches main app |

### Why `extractable: true` in the Extension

The Web Crypto API's `CryptoKey` objects cannot be serialized — they can't be stored in `chrome.storage.session` or passed across service worker restarts. The solution:

1. Derive the key with `extractable: true`
2. Export the raw 32-byte key with `crypto.subtle.exportKey('raw', key)`
3. Store the `Uint8Array` bytes in `chrome.storage.session`
4. When decrypting, re-import the bytes as `extractable: false` for the actual operation

This is acceptable because `chrome.storage.session` is sandboxed to this extension only and auto-clears on browser close.

---

## 🔧 Backend CORS Update

The backend `server.js` CORS policy now allows extension origins:

```js
origin.startsWith('chrome-extension://') ||
origin.startsWith('moz-extension://')
```

---

## 🧪 Testing

1. Load the extension unpacked
2. Navigate to `http://localhost:5173` (the PassVault app) and log in, add a credential for `github.com`
3. Navigate to `https://github.com/login`
4. Open the extension popup — it should show the saved GitHub credential
5. Click **Fill** — username and password fields should be populated
