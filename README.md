# 🛡️ PassOP — Next-Gen Interactive Password Manager & Cryptographic Vault

[![React 19](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-black?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![Lenis Scroll](https://img.shields.io/badge/Lenis-Smooth_Scroll-FF4500?style=for-the-badge)](https://lenis.darkroom.engineering/)
[![Express](https://img.shields.io/badge/Express-5.2-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.3-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![JWT Auth](https://img.shields.io/badge/JWT-Protected-black?style=for-the-badge&logo=json-web-tokens&logoColor=white)](https://jwt.io/)

A modern, full-stack password management platform and high-end interactive showcase. Built with **React 19**, **Three.js**, **Express**, and **MongoDB**, featuring **Linear/Apple-inspired motion aesthetics**, zero-lag client interactions, real-time cryptographic visualizers, and a secure multi-tenant credential vault.

---

## 🚀 Current Progress & Milestone Overview

Recent updates have elevated PassOP from a basic CRUD utility to a full-fledged, design-engineered product experience:

- [x] **Interactive 3D Cryptographic Network Globe**: Custom Three.js Canvas with dynamic node constellations, cryptographic ping ripples, animated data packets, and orbital arcs.
- [x] **Linear-Inspired Visual & Motion System**:
  - `useSpotlight`: Real-time cursor-tracking specular lighting across bento cards.
  - `useTilt`: Physics-based 3D card tilt transformations.
  - `useScrollReveal`: Intersection-driven stagger and element reveals.
  - `useMagnetic`: Micro-spring physics on call-to-action buttons.
  - Smooth inertial momentum scrolling via **Lenis** (with automatic `prefers-reduced-motion` detection).
- [x] **Interactive Cryptographic Sandboxes**:
  - **Live Cipher Hash Sandbox**: Real-time deterministic keystroke hashing and kinetic scramble animations.
  - **Entropy & Fortified Password Simulator**: Live strength evaluation and secure password generation sandbox on the landing page.
- [x] **Authenticated Personal Vault (`Manager.jsx`)**:
  - Complete multi-tenant account isolation with JWT tokens.
  - Full CRUD: Create, Read, Edit (with auto-scroll), and Delete credentials.
  - One-click copy to clipboard for URLs, usernames, and passwords with toast alerts and visual copied states.
  - Real-time password strength meter (Basic, Moderate, Strong, Fortified) with dynamic progress bar.
  - Cryptographically secure password generator using `crypto.getRandomValues`.
  - Instant live filter & search by website domain or username.
  - Graceful degradation / offline mode if backend API is temporarily disconnected.
- [x] **Multi-Tenant Backend & Security (`server.js`)**:
  - User registration & login with `bcryptjs` password hashing (12 salt rounds).
  - Stateless JWT authentication with 7-day token lifecycle.
  - MongoDB database integration with scoped per-user collections.
  - Centralized health checks and CORS configuration.

---

## 🌟 Key Features

### 1. 🎨 Immersive Landing Experience & Motion Design
- **3D Interactive WebGL Globe**: A custom particle-based Three.js globe illustrating decentralized cryptographic nodes, data transmission packets, and global telemetry.
- **Spotlight Cards**: Specular highlight borders and radial gradient tracks inspired by Linear and Vercel.
- **Interactive Cipher Pipeline**: Visual walkthrough of hashing and zero-knowledge principles.
- **Micro-Interactions**: Hover lifts, magnetic buttons, custom spring transitions, and custom animated SVG locks.

### 2. 🔑 Personal Vault Manager
- **Credential Storage**: Securely organize logins by website/service, username/email, and password.
- **Password Strength Analyzer**: Real-time entropy feedback evaluating length, uppercase, lowercase, numbers, and special characters.
- **One-Click Fortified Password Generator**: Generates 16-character high-entropy passwords using native browser cryptography.
- **Search & Filter**: Find accounts instantly with zero keystroke lag.
- **Show/Hide & Copy Controls**: Discreet eye toggles to mask secrets and one-click copy buttons with toast confirmations.

### 3. 🛡️ Secure Multi-User Backend
- **Isolated User Vaults**: Every credential is strictly keyed to `userId`, preventing unauthorized access.
- **Stateless Bearer Authentication**: Requests verified via standard `Authorization: Bearer <token>` headers.
- **Input Validation & Sanitization**: Enforces strict payload validation across all endpoints.

---

## 🛠️ Tech Stack & Architecture

### Frontend
| Technology | Role |
|---|---|
| **React 19** | Component architecture & modern hooks |
| **Vite 8** | Next-generation fast frontend tooling |
| **Tailwind CSS v4** | Utility-first responsive styling and CSS design tokens |
| **Three.js** | 3D WebGL cryptographic globe visualizer |
| **Lenis** | Inertial smooth scrolling experience |
| **GSAP** | Motion interpolation and timing functions |
| **Phosphor Icons** | Clean, minimalist icon system |
| **React Toastify** | Elegant system feedback and status notifications |
| **UUID** | Unique client-side key generation |

### Backend
| Technology | Role |
|---|---|
| **Node.js & Express 5** | RESTful API server |
| **MongoDB Native Driver (v7.3)** | Document store for users and vaults |
| **jsonwebtoken (JWT)** | Token creation and route authorization |
| **bcryptjs** | Password hashing with 12 salt rounds |
| **dotenv & CORS** | Config management and cross-origin security |

---

## 📁 Repository Structure

```
PasswordProject/
├── backend/
│   ├── .env.example          # Sample backend configuration
│   ├── package.json          # Express & MongoDB dependencies
│   └── server.js             # API routes, auth middleware & DB connection
├── src/
│   ├── assets/               # Security & vault visual assets
│   ├── Component/
│   │   ├── Auth.jsx          # Register/Sign-in modal dialog
│   │   ├── CryptographicNetworkGlobe.jsx  # Three.js 3D interactive globe
│   │   ├── Footer.jsx        # App footer with status signals
│   │   ├── LandingPage.jsx   # Linear-style interactive showcase
│   │   ├── Manger.jsx        # Password vault CRUD, generator & search
│   │   └── NavBar.jsx        # Adaptive navigation & session controls
│   ├── hooks/
│   │   ├── useMotion.js      # Spotlight, Tilt, ScrollReveal & Magnetic hooks
│   │   └── useSmoothScroll.js# Lenis smooth scrolling integration
│   ├── App.jsx               # View router, session manager & modal provider
│   ├── index.css             # Tailwind tokens, keyframes & glassmorphism
│   └── main.jsx              # React application entry point
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## ⚡ Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or later
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017`) or a MongoDB Atlas URI

---

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your environment variables:
   ```bash
   cp .env.example .env
   ```
   Ensure `.env` contains:
   ```env
   MONGO_URL=mongodb://127.0.0.1:27017/passOP
   DB_NAME=passOP
   PORT=3000
   CORS_ORIGIN=http://localhost:5173
   JWT_SECRET=your-super-strong-jwt-secret-key-here
   ```

4. Start the backend API:
   ```bash
   npm run dev
   ```
   The backend will start at `http://localhost:3000`.

---

### 2. Frontend Setup

1. From the project root (`PasswordProject/`):
   ```bash
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```

3. Open your browser and visit:
   ```
   http://localhost:5173
   ```

---

## 📡 API Reference

### Authentication Endpoints
| Method | Route | Description | Auth Required |
|---|---|---|:---:|
| `POST` | `/api/auth/register` | Register a new user account | ❌ |
| `POST` | `/api/auth/login` | Authenticate user & issue JWT | ❌ |

**Register/Login Payload**:
```json
{
  "email": "developer@example.com",
  "password": "StrongPassword123!"
}
```

### Password Vault Endpoints
All password endpoints require: `Authorization: Bearer <jwt_token>`

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/passwords` | Fetch all saved credentials for active user |
| `POST` | `/api/passwords` | Add a new credential to the vault |
| `PUT` | `/api/passwords/:id` | Update an existing credential by ID |
| `DELETE` | `/api/passwords/:id` | Delete a credential by ID |
| `GET` | `/health` | System health check (`{ ok: true }`) |

---

## 🔒 Security & Educational Notice

> [!NOTE]
> **Learning & Portfolio Context**: While PassOP implements industry-standard JWT authentication and bcrypt password hashing for user accounts, vault credentials currently traverse and persist in raw form for demo and educational clarity. 
> For production environments, implement **client-side Zero-Knowledge encryption** (e.g. WebCrypto AES-256-GCM derived via PBKDF2/Argon2 from a client master passphrase) before transmission to the server.

---

## 🗺️ Future Roadmap

- [ ] **Client-Side Zero-Knowledge Encryption**: End-to-end AES-256-GCM encryption in the browser prior to network dispatch.
- [ ] **Two-Factor Authentication (2FA)**: Time-based One-Time Password (TOTP) integration.
- [ ] **Vault Export & Import**: Encrypted JSON, CSV, and Bitwarden/1Password format compatibility.
- [ ] **Breach Detection**: Integration with HaveIBeenPwned API to notify users of compromised passwords.
- [ ] **Browser Extension**: Chromium extension companion for auto-filling and auto-saving credentials.

---

## 📄 License

Distributed under the ISC License. See `package.json` for details.