# Solli

Solli ("say it" in Tamil) is a mobile-friendly voice form-filler prototype. People will speak their answers, and the app will transcribe them, help fill an old-age pension application, read it back, and eventually create a printable PDF.

## Tech stack

- React and Vite (JavaScript) with plain CSS
- Node.js 18+ and Express (ES modules)
- Planned Gnani AI integrations: Prisma, Timbre, and Evon

## Scope

The product boundary, priorities, limitations, and intended users are defined in [docs/SCOPE.md](docs/SCOPE.md).

## Setup

Use two terminals from this folder.

```powershell
cd server
npm install
npm run dev
```

```powershell
cd client
npm install
npm run dev
```

Open the local address Vite prints (normally http://localhost:5173). The client proxies `/api` requests to the server on port 5000.

This is a prototype: use only fake sample data. Do not enter real personal information.
