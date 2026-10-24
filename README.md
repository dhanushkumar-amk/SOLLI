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

## Extraction Evaluation & Real Collector (`extract:eval`)

Phase 9 established a stratified evaluation pipeline with zero data leakage:
- **Dev Set (`tests/fixtures/spoken_dev.json`, 53 items):** Used for rule tuning and few-shot calibration. Current accuracy: **98.1%**.
- **Held-out Set (`tests/fixtures/spoken_heldout.json`, 25 items):** Strictly isolated for reporting. Current accuracy: **96.0%**. CI test `server/tests/heldout-guard.test.js` prevents leakage.
- **Real Collector (`/dev/collect`):** Dev-only UI (`import.meta.env.DEV`) to speak FAKE answers via Prisma STT and append records to git-ignored `samples/real_transcripts.json`.

```bash
cd server
npm run extract:eval -- --set dev       # Run on development set (100.0% accuracy)
npm run extract:eval -- --set heldout   # Run on strict held-out set (96.0% accuracy)
npm run extract:eval -- --set real      # Run on empirical collected transcripts (100.0%)
npm run extract:eval -- --set all       # Run across dev + held-out combined
npm run extract:eval -- --set dev --types date,number,phone,aadhaar,bank_account,ifsc # Filter by types
```

See [docs/EXTRACTION_REPORT.md](docs/EXTRACTION_REPORT.md) and [docs/NUMBER_DATE_REPORT.md](docs/NUMBER_DATE_REPORT.md) for full baseline comparisons, breakdown tables, and failure analyses.

## Number & Date Understanding (Phase 10)

- **Pure Number Parser (`server/llm/numbers/parse.js`):** Parses English/Tamil number words, repetition patterns ("double five" -> 55, "triple zero" -> 000), Indian scales (lakh/crore/nooru/aayiram), and digit sequences.
- **"Never Accept Long Numbers Silently":** Sensitive identifiers (Aadhaar, Phone, Bank Account, IFSC) always enforce confirmation (`confirm: "always"`), format validation, and masked presentation (`XXXX 1234`).
- **Chunked Readback (`server/llm/numbers/chunk.js`):** Grouped speech with natural pauses for Timbre TTS (phone 5+5, Aadhaar 4+4+4, bank account groups of 4). Partial captures prompt for remaining digits.
- **Spell-Out Mode (`server/llm/extractors/spell.js`):** Letter-by-letter spelling mode ("M U T H U", "K dot M U T H U") for low-confidence applicant names.


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

## Voice Question Loop (`/app`)

The voice conversation loop runs at route `/app` (or click "Open Voice Form Helper" on the home page):
1. **Autoplay Compliance:** Starts with a prominent "தொடங்கு / Start" button to initialize audio playback.
2. **Conversation Flow:** Synthesizes question via Timbre TTS -> records applicant speech (with 15s auto-stop) -> transcribes with Prisma STT -> extracts & validates value -> stores in session memory -> queries next field via `/api/form/:id/next`.
3. **Retry & Silence Rules:** Maximum 2 attempts per field. Silence plays help prompt once. Repeated failures or silence courteously defer with *"இதை அப்புறம் பார்க்கலாம் / Let us come back to this"* and advance to the next field, marking the question for operator help.
4. **Zero-Credit Typed Test Mode:** In development mode, toggle **"Typed Test Mode"** and **"Mute Voice"** to complete the entire form with fake data using 0 API credits.
5. **Credit Guard & Caching:** Static form questions hit an in-memory cache (`X-Cache: HIT`), and live calls are guarded by `MAX_LIVE_CALLS_PER_HOUR=120` returning 429 before exhausting credits.

See [docs/CONVERSATION_FLOW.md](docs/CONVERSATION_FLOW.md) for the complete state machine diagram and transition table.

## Read-back, Confirmation & Review (Phase 11)

- **Confirmation Policy (`server/forms/confirmPolicy.js`):** Pure matrix (`shouldConfirm`) based on field schema (`always`, `if_uncertain`, `never`), extraction confidence, and self-corrections. Critical identifiers always require confirmation.
- **Split Read-Back Audio:** Dynamically synthesized values are decoupled from static confirmation prompts. The static prompt (`"இது சரியா? ஆம் அல்லது இல்லை என்று சொல்லுங்கள்."`) achieves a 100% cache HIT on subsequent fields, preserving the 5,000 credit budget.
- **Accessible Touch Fallbacks:** Prominent on-screen **"👍 ஆம் / Yes"** and **"👎 இல்லை / No"** buttons are visible during all confirmation steps, allowing instant tap-based verification with zero latency and 0 API calls.
- **Confirmation Loop Guardrails:** Silence during confirmation is strictly treated as unclear (never as "yes"). A maximum of 3 confirmation rounds per field prevents endless loops; unresolved fields are marked `needsOperatorHelp`.
- **Review Screen & Single-Field Tap Edit:** After the last field, an interactive review screen lists all fields with masked sensitive values, status badges, and tap-based "Edit" buttons. "Read everything to me" speaks the summary with pause/stop controls and character budget capping (`MAX_SUMMARY_CHARS=1200`). Final confirmation leads to `readyForPdf`.

See [docs/CONFIRMATION_POLICY.md](docs/CONFIRMATION_POLICY.md) for the policy matrix, read-back rules, and privacy trade-offs.

## Voice Commands & Field Editing (Phase 12)

Solli provides a "false-positives first" voice command detection and field targeting layer (`server/llm/commands/`):
- **Safety First:** A command misheard as an answer, or an answer misheard as a command, never corrupts data. Utterances > 6 words are strictly treated as answers.
- **In-Answer Partial Corrections:** Supports whole-value contrast resolution ("Madurai not Salem", "Salem illa Madurai") and digit-level edits ("last digit is 7") on numeric fields with mandatory read-back confirmation.
- **Zero-Network Command Evaluation:** Benchmark command detection accuracy and false-positive rates with `npm run commands:eval`.
- **Review Screen Voice Editing:** Tap "Speak a change" on the review screen to record an 8-second clip, resolve target field aliases, and immediately jump to edit.

### Voice Commands Quick Reference for Helpdesk Operators

| Command | English Examples | Tamil Examples (Roman & Script) | Safe Action |
|---|---|---|---|
| `repeat` | "repeat", "say again", "once more" | "thirumba sollunga", "meendum sollunga", "மீண்டும்", "ரிப்பீட்" | Replays question or read-back. Never counts as a failed attempt. |
| `skip` | "skip", "next question", "pass" | "aduthadhu", "vittudunga", "idha thavir", "தவிர்" | Allowed on optional fields only (`nominee`). Refused on required fields. |
| `dont_know` | "I don't know", "no idea", "not sure" | "theriyadhu", "theriyala", "puriyala", "தெரியாது", "ஐ டோன்ட் நோ" | Marks field `needsOperatorHelp` with reason `"dont_know"`. Never invents data. |
| `back` | "back", "go back", "previous" | "munnadi ponga", "munthaiya kelvi", "முன்னாடி போங்க" | Re-asks previous spoken field, keeping current value visible. Halts at first field. |
| `change_field` | "change the village", "change phone" | "ooru maathunga", "maathanum", "சேஞ்ச் த வில்லேஜ்", "மாத்துங்க" | Fuzzy matches target against all 12 spoken fields. Retains old value until new value confirmed. |
| `help` | "help", "help me", "explain" | "udhavi venum", "vilakkam", "vilakkavum", "உதவி", "ஹெல்ப்" | Speaks field's `helpPrompt` then resumes listening. |
| `operator` | "operator", "call operator", "staff" | "adhigaari venum", "panithalar", "ஆபரேட்டர்", "பணியாளர்" | Pauses loop, shows large "Operator Needed" banner, awaits resume tap. |
| `stop` | "stop", "pause", "hold on", "wait" | "niruthunga", "nillu", "oru nimisham", "நிறுத்து", "வெயிட்" | Releases microphone, displays "Conversation Paused" banner with Resume button. |
| `start_over` | "start over", "restart", "delete all" | "modhalla irundhu", "mutrilum azhi", "முதலில் இருந்து ஆரம்பி" | **High risk:** ALWAYS prompts modal confirmation ("Delete everything and start again?"). |

To run voice command evaluation:
```bash
cd server
npm run commands:eval -- --set dev       # Accuracy: 100.0%, FPR: 0.0%, FNR: 0.0%
npm run commands:eval -- --set heldout   # Held-out FPR: 0.0%, Accuracy: 41.7%
```

See [docs/COMMANDS.md](docs/COMMANDS.md) for full phrase tables, safety gating, and architecture details.

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
