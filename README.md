# PassVault

PassVault is a password manager with a React frontend and an Express API backed by MongoDB. Vault entries are encrypted in the browser before they are sent to the API. The app also includes a password generator, vault health checks, import/export, inactivity locking, and encrypted one-time secret sharing.

## Features

- Browser-side vault encryption using the Web Crypto API (PBKDF2 key derivation and AES-GCM encryption).
- Credential management with categories, favorites, tags, custom fields, search, and password history.
- Password and passphrase generation, plus a vault health audit and Have I Been Pwned range checks.
- CSV import from common password managers and encrypted JSON export.
- Optional quick PIN unlock and configurable inactivity locking.
- PassVault Send for expiring, view-limited encrypted secret links.

## Requirements

- Node.js 20 or later is recommended (the frontend uses Vite 8).
- MongoDB, local or hosted.
- A modern browser with Web Crypto API support.

## Run locally

Use two terminals from the repository root.

### 1. Configure and start the API

```sh
cd backend
npm install
```

Create `backend/.env` with the following values. Use unique, randomly generated secrets outside local development, and never commit `.env` files.

```env
MONGO_URL=mongodb://127.0.0.1:27017/passOP
DB_NAME=passOP
PORT=3000
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=replace-with-a-long-random-secret
VAULT_ENCRYPTION_KEY=replace-with-a-separate-random-secret
NODE_ENV=development
```

Start the API:

```sh
npm run dev
```

It listens at `http://localhost:3000` by default. Check `http://localhost:3000/health` for the liveness endpoint.

### 2. Configure and start the frontend

In a second terminal, from the repository root:

```sh
npm install
```

Create a root `.env` file to set the API URLs (these are the frontend variables from `.env.example`):

```env
VITE_AUTH_API_URL=http://localhost:3000/api/auth
VITE_API_BASE_URL=http://localhost:3000/api/passwords
VITE_SENDS_API_URL=http://localhost:3000/api/sends
```

Then run:

```sh
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Commands

Run frontend commands from the repository root:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Build the frontend into `dist/`. |
| `npm run preview` | Preview the production build locally. |
| `npm run lint` | Run ESLint on the frontend. |

Run backend commands from `backend/`:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API with Node.js. |
| `npm start` | Start the API with Node.js. |

## Security notes

- Vault content is encrypted in the browser; the API stores ciphertext for vault entries. Account authentication and application metadata still involve the server.
- The vault key is derived in the browser from the master password and is not persisted as a browser storage item. Anyone with access to an unlocked device may still access the open vault.
- State-changing API requests use CSRF protection. Configure `CORS_ORIGIN` to the exact frontend origin(s) when deploying.
- The Have I Been Pwned check uses the range API: the browser sends only a short SHA-1 hash prefix, then checks returned suffixes locally.
- A PassVault Send URL contains its decryption key in the URL fragment. Share the complete link through a channel appropriate for the secret.
- For deployment, use HTTPS for both frontend and API, keep secrets out of source control, restrict MongoDB access, and set each `VITE_*_API_URL` to the deployed API. Frontend `VITE_*` values are included in the built client and must not contain secrets.

## License

ISC. See the package manifests for license metadata.
