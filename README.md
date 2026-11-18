# PassVault

A **zero-knowledge password manager** built with React + Express + MongoDB. All vault entries are encrypted in the browser using the Web Crypto API before they ever reach the server — the backend stores only ciphertext and never sees a plaintext password.

---

## ✨ Features

### 🔐 Core Vault
- **Zero-knowledge encryption** — AES-256-GCM encryption/decryption happens entirely in the browser. The server stores only opaque ciphertext.
- **PBKDF2 key derivation** — 600,000 iterations of SHA-256 (NIST SP 800-132 2023 recommendation) derives a vault key from your master password + email + a random per-user salt.
- **Non-extractable vault key** — The derived `CryptoKey` lives only in React state (RAM). A page refresh requires master password re-entry.
- **Credential management** — Create, edit, delete, favorite, tag, and search credentials. Supports custom fields and secure notes.
- **Password history** — Full revision history per credential with timestamps.

### 🛡️ Security & Access
- **4-digit PIN unlock** — Quick vault unlock without re-entering your full master password, with escalating lockout on failed attempts (5 s → 30 s → 2 min → 10 min).
- **Inactivity auto-lock** — Vault locks automatically after a configurable idle timeout.
- **Vault Security & Access Audit Log** — Chronological activity trail: unlocks, clipboard copies, failed PIN attempts, exports. JSON export supported.
- **Brute-force protection** — Rate-limited auth endpoints; bcrypt cost factor configurable via env.
- **HTTP security headers** — Helmet.js (CSP, clickjacking protection, MIME sniffing prevention).
- **CSRF protection** — Double-submit cookie pattern on all state-changing requests.

### 🧰 Utilities
- **Password & passphrase generator** — Configurable length, symbols, digits, and word-based passphrases.
- **Vault health audit** — Flags weak, reused, and old passwords at a glance.
- **Have I Been Pwned integration** — Range API check: only a 5-char SHA-1 prefix is sent; suffix matching happens locally.
- **CSV import** — Import credentials from Bitwarden, 1Password, LastPass, and generic CSV exports.
- **Encrypted JSON export** — Full vault export and re-import with format validation.
- **Vault migration** — Upgrade legacy credential formats in-place.

### 🔗 PassVault Send
- **Encrypted one-time secret sharing** — Generate expiring, view-limited secret links. The decryption key lives only in the URL fragment (#) — the server never sees it.

### 🌐 Browser Extension *(Manifest V3)*
- **Auto-fill on any website** — The extension detects login forms and fills username + password with one click.
- **Domain-aware matching** — Credentials are filtered to the current tab's domain.
- **Session-scoped vault key** — Stored in `chrome.storage.session` (auto-cleared on browser close, invisible to web pages).
- Works in Chrome and Edge.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 8, Tailwind CSS |
| Crypto | Web Crypto API (SubtleCrypto) — PBKDF2 + AES-256-GCM |
| Backend | Node.js, Express 5 |
| Database | MongoDB (via native driver) |
| Auth | JWT (HttpOnly cookie) + CSRF double-submit |
| Extension | Manifest V3, Chrome Storage Session API |

---

## 🚀 Run Locally

You need two terminals and a running MongoDB instance.

### Prerequisites
- Node.js 20+
- MongoDB (local at `127.0.0.1:27017` or a hosted URI)

---

### 1 — Start MongoDB

```sh
# Example: local mongod (adjust --dbpath as needed)
mongod --dbpath ./mongodb_data --bind_ip 127.0.0.1 --port 27017
```

---

### 2 — Start the Backend API

```sh
cd backend
npm install
```

Create `backend/.env`:

```env
MONGO_URL=mongodb://127.0.0.1:27017/passOP
DB_NAME=passOP
PORT=3000
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=replace-with-a-long-random-secret
VAULT_ENCRYPTION_KEY=replace-with-a-separate-random-secret
NODE_ENV=development
BCRYPT_ROUNDS=12
```

> **Never commit `.env` files.** Use unique, randomly generated secrets in production.

Start the server:

```sh
node server.js
```

Health check: `http://localhost:3000/health`

---

### 3 — Start the Frontend

In a second terminal from the **project root**:

```sh
npm install
```

Create a root `.env` file:

```env
VITE_AUTH_API_URL=http://localhost:3000/api/auth
VITE_API_BASE_URL=http://localhost:3000/api/passwords
VITE_SENDS_API_URL=http://localhost:3000/api/sends
```

Start the dev server:

```sh
npm run dev
```

Open `http://localhost:5173` in your browser.

---

### 4 — Load the Browser Extension *(optional)*

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension/` folder inside this project
5. Click the **PassVault** icon in your toolbar, sign in with your email + master password, then visit any site with saved credentials and click **Fill**

See [`extension/README_EXTENSION.md`](extension/README_EXTENSION.md) for detailed extension docs and security model.

---

## 🧪 Commands

### Frontend *(run from project root)*

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build into `dist/` for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across the whole project |

### Backend *(run from `backend/`)*

| Command | Description |
|---|---|
| `node server.js` | Start the API server |
| `npm run dev` | Start with auto-reload (if nodemon configured) |

---

## 🔒 Security Model

| Concern | Approach |
|---|---|
| **Vault encryption** | AES-256-GCM, browser-only. Server stores ciphertext exclusively. |
| **Key derivation** | PBKDF2 · 600k iterations · SHA-256 · per-user random salt (server-stored) |
| **Vault key persistence** | Never written to `localStorage` or `sessionStorage`. Lives in React state (RAM) only. |
| **Authentication** | JWT in an HttpOnly cookie (7-day expiry). Never accessible to JS. |
| **CSRF** | Double-submit cookie: `XSRF-TOKEN` cookie + `X-CSRF-Token` request header. |
| **Extension key storage** | Raw key bytes stored in `chrome.storage.session` — session-scoped, auto-cleared on browser close, extension-sandboxed. |
| **HIBP check** | k-Anonymity range API — only the first 5 hex chars of a SHA-1 hash are sent; matching done locally. |
| **PassVault Send** | Decryption key lives only in the URL fragment (`#key=…`). Server never receives it. Links expire after a configured view count or TTL. |
| **HTTP headers** | Helmet.js — CSP, X-Frame-Options, X-Content-Type-Options, HSTS (production). |
| **Rate limiting** | Auth endpoints rate-limited to prevent brute-force login attacks. |
| **Input sanitization** | Dangerous HTML characters stripped server-side before DB writes. |
| **Body size limit** | JSON body capped at 200 KB — a password manager never needs large payloads. |

> **Deployment checklist**: HTTPS on both frontend and API, `CORS_ORIGIN` set to exact production origin, MongoDB access restricted, `JWT_SECRET` and `VAULT_ENCRYPTION_KEY` rotated per environment, `NODE_ENV=production`.

---

## 📁 Project Structure

```
PasswordProject/
├── backend/              Express API + MongoDB
│   ├── server.js         Main server (auth, passwords, sends, CSRF, rate limiting)
│   └── .env              Backend secrets (not committed)
├── extension/            Manifest V3 Chrome/Edge extension
│   ├── manifest.json
│   ├── background.js     Service worker — auth proxy, crypto, fill router
│   ├── content.js        Page script — form detection & autofill
│   ├── popup.html/js/css Extension popup UI
│   └── icons/            16×16 → 128×128 PNGs
├── src/
│   ├── Component/        React UI components
│   └── utils/            cryptoVault.js, auditLogger, csrf, pinAuth, …
├── public/
├── .env                  Frontend Vite env vars (not committed)
└── vite.config.js
```

---

## 📄 License

ISC — see `package.json` for metadata.
