# PassOP Password Manager

A full-stack password manager built with React, Express, and MongoDB.

## Features

- Add, edit, and delete password entries
- Register and sign in with a protected user account
- Store entries in MongoDB
- Copy websites, usernames, and passwords to the clipboard
- Show or hide the password input
- Responsive interface with toast notifications

## Tech Stack

- React 19 and Vite
- Tailwind CSS
- Express
- MongoDB
- React Toastify

## Setup

### 1. Frontend

From the project root:

```bash
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

### 2. Backend

Open another terminal:

```bash
cd backend
npm install
```

Copy `backend/.env.example` to `backend/.env`, then update the values if needed:

```env
MONGO_URL=mongodb://127.0.0.1:27017/passOP
DB_NAME=passOP
PORT=3000
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=replace-this-with-a-long-random-secret
```

Start the API:

```bash
npm run dev
```

The backend runs at `http://localhost:3000`.

## API Routes

- `GET /api/passwords`
- `POST /api/passwords`
- `PUT /api/passwords/:id`
- `DELETE /api/passwords/:id`
- `GET /health`

Password routes require a bearer token from `/api/auth/register` or `/api/auth/login`.

## Build

```bash
npm run lint
npm run build
```

## Important

This is a learning project. Vault passwords are still stored as plain text and should not be used for real credentials without encryption, HTTPS, rate limiting, and other production security controls.