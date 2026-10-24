# Solli

Paper forms can be difficult for elderly and first-time rural applicants to complete without help. CSC and panchayat helpdesk operators often repeat questions, type answers, and check details manually. Solli is a planned voice-guided workflow for one old-age pension form: it records Tamil-English mixed answers, prepares the form for review, and creates a printable PDF without submitting it to a portal.

## Tech stack

- React and Vite (JavaScript) with plain CSS
- Node.js 18+ and Express (ES modules)

## Gnani AI models used

| Model | Planned role |
|---|---|
| Prisma v2.5 | Speech to text for recorded applicant answers. |
| Timbre v3.0 | Text to speech for questions and read-back. |
| Evon v3.3 | Optional reasoning for ambiguous field extraction; rules remain the fallback. |

## Scope

The product boundary, priorities, limitations, and intended users are defined in [docs/SCOPE.md](docs/SCOPE.md).

## Form

The current inventory is in [docs/FORM_FIELDS.md](docs/FORM_FIELDS.md). It remains UNVERIFIED until a public blank source form is supplied.

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
