# Solli

Paper forms can be difficult for elderly and first-time rural applicants to complete without help. CSC and panchayat helpdesk operators often repeat questions, type answers, and check details manually. Solli is a planned voice-guided workflow for one old-age pension form: it records Tamil-English mixed answers, prepares the form for review, and creates a printable PDF without submitting it to a portal.

## Tech stack

- React and Vite (JavaScript) with plain CSS
- Node.js 18+ and Express (ES modules)

## Gnani AI models used

| Model | Planned role |
|---|---|
| Prisma v2.5 | Speech to text for recorded applicant answers (`POST /stt/v3`). |
| Timbre v3.0 | Text to speech for questions and read-back (`POST /api/v1/tts/inference`). |
| Evon v3.3 | Optional reasoning for ambiguous field extraction; rules remain the fallback. |

## Evon routes (Field Extraction)

Solli uses a swappable provider architecture in `server/llm/` controlled by the `EVON_PROVIDER` environment variable:

- **Route A (`EVON_PROVIDER=rules`)**: High-speed, deterministic rule-based baseline in `server/llm/rules.js`. Extracts numbers, dates, addresses, Tamil/English yes/no, and conversational commands with zero credit usage and <1ms latency.
- **Route B (`EVON_PROVIDER=evon-api`)**: Gnani AI closed beta API client. (Currently marked `NOT CONFIGURED` pending beta credentials).
- **Route C (`EVON_PROVIDER=evon-selfhost`)**: OpenAI-compatible client for self-hosted vLLM/SGLang (`gnani/gnani-evon-v3.3-30B-A3B`) on rented cloud GPU. Base URL configured via `EVON_SELFHOST_URL`.

**Automatic Fallback Guard**: If a selected LLM provider throws an error or times out (8 seconds), Solli automatically falls back to `rules` without crashing the user session.

To benchmark field extraction accuracy on spoken fixtures:
```bash
cd server
npm run evon:smoke           # Default 10 fixtures
npm run evon:smoke -- --limit 20
```

See [docs/EVON_DECISION.md](docs/EVON_DECISION.md) for the decision matrix and evaluation runbook.

## Scope

The product boundary, priorities, limitations, and intended users are defined in [docs/SCOPE.md](docs/SCOPE.md).

## Form

The current inventory is in [docs/FORM_FIELDS.md](docs/FORM_FIELDS.md). It remains UNVERIFIED until a public blank source form is supplied.

## Form definition

The single source of truth for the pension form is `server/forms/pension.json`. It defines all 16 fields (12 spoken, 4 non-spoken physical form fields like photo and signature) with bilingual questions, help prompts, read-backs, validation rules, confirmation policies, sensitive flags, and PDF layout placeholders.

See [docs/FORM_SCHEMA.md](docs/FORM_SCHEMA.md) for full schema specifications and validation rules.

To validate the form schema and view the field table:
```bash
cd server
npm run form:check
```

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
