# Speech-to-Field Extraction & Evaluation Report (Phase 9)

**Date:** 2026-10-24  
**Project:** Solli (Tamil-English Voice Form-Filler)  
**Evaluation Provider:** `rules` (zero live API credits consumed)  
**Datasets:**
- `dev` (53 items, ~68% stratified split)
- `heldout` (25 items, ~32% stratified split)
- `real` (collector-generated live transcripts via `/dev/collect`)

---

## 1. Executive Summary & Baseline vs After

Prior to Phase 9, an optimistic 95% accuracy was reported across synthetic fixtures created by the same agent. To establish rigorous, un-biased metrics, we split `tests/fixtures/spoken_answers.json` into a stratified development set (`spoken_dev.json`, 53 items) and a strict held-out set (`spoken_heldout.json`, 25 items) with a fixed seed (`seed = 42`).

**Evaluation Rule:** Rules, prompts, and few-shot examples were tuned **ONLY** using the development set and real transcripts. The held-out set was strictly isolated and used solely for evaluation reporting. A leakage guard test (`server/tests/heldout-guard.test.js`) runs in CI/CD to prevent any held-out string from appearing in `server/llm/` source code.

### Summary Metrics

| Dataset | Items | Baseline Accuracy | After Pipeline Accuracy | Delta | Avg Latency |
|---|---|---|---|---|---|
| **Development (`dev`)** | 53 | 94.3% (50/53) | **98.1%** (52/53) | **+3.8%** | < 1 ms |
| **Held-out (`heldout`)** | 25 | 96.0% (24/25) | **96.0%** (24/25) | **+0.0%** | < 1 ms |
| **Real Transcripts (`real`)** | 1+ | N/A | **100.0%** (1/1) | N/A | ~2 ms |

> [!NOTE]
> Held-out accuracy remained steady at 96.0% (24/25) without artificial inflation or post-hoc rule overfitting. The single held-out failure was an intrinsic fixture artifact where the speaker uttered "K. Muthulakshmi" but the fixture expected "K. Demo Muthulakshmi".

---

## 2. Accuracy Breakdown by Field

### Development Set (`dev`, 53 items)

| Field ID | Field Type | Baseline Acc | After Acc | Baseline Failures | After Pipeline Status |
|---|---|---:|---:|---|---|
| `aadhaar` | aadhaar | 100.0% (4/4) | 100.0% (4/4) | None | Preserved Phase 7 logic |
| `address` | address | 100.0% (4/4) | 100.0% (4/4) | None | Normalised door numbers; `needsConfirmation: true` |
| `applicant_name` | name | 100.0% (3/3) | 100.0% (3/3) | None | Title-cased; initials preserved |
| `bank_account` | bank_account | 100.0% (3/3) | 100.0% (3/3) | None | Preserved Phase 7 logic |
| `date_of_birth` | date | 100.0% (3/3) | 100.0% (3/3) | None | Preserved Phase 7 logic |
| `district` | text | 80.0% (4/5) | **100.0%** (5/5) | "Sample district" -> "Sample" failed | **Fixed**: Stripped "district" noise suffix |
| `gender` | choice | 100.0% (4/4) | 100.0% (4/4) | None | Levenshtein matching + Tamil script support |
| `nominee` | name | 100.0% (4/4) | 100.0% (4/4) | None | Title-cased; initials preserved |
| `parent_spouse_name` | name | 100.0% (4/4) | 100.0% (4/4) | None | Title-cased; initials preserved |
| `phone` | phone | 75.0% (3/4) | 75.0% (3/4) | 11-digit invalid phone failed validator | Intentionally invalid fixture (11 digits) |
| `readback_confirmation` | yes_no | 100.0% (5/5) | 100.0% (5/5) | None | Handles Tamil/English affirmative/negative |
| `taluk` | text | 80.0% (4/5) | **100.0%** (5/5) | "Test taluk" -> "Test" failed | **Fixed**: Stripped "taluk" noise suffix |
| `village` | text | 100.0% (5/5) | 100.0% (5/5) | None | Cleaned prefixes ("village peru", "gramam") |

### Held-out Set (`heldout`, 25 items)

| Field ID | Field Type | Baseline Acc | After Acc | Held-out Status |
|---|---|---:|---:|---|
| `aadhaar` | aadhaar | 100.0% (2/2) | 100.0% (2/2) | Clean extraction |
| `address` | address | 100.0% (2/2) | 100.0% (2/2) | Clean extraction |
| `applicant_name` | name | 66.7% (2/3) | 66.7% (2/3) | 1 failure (fixture fixture artifact, see Section 4) |
| `bank_account` | bank_account | 100.0% (3/3) | 100.0% (3/3) | Clean extraction |
| `date_of_birth` | date | 100.0% (3/3) | 100.0% (3/3) | Clean extraction |
| `district` | text | 100.0% (1/1) | 100.0% (1/1) | Clean extraction |
| `gender` | choice | 100.0% (2/2) | 100.0% (2/2) | Clean extraction |
| `nominee` | name | 100.0% (2/2) | 100.0% (2/2) | Clean extraction |
| `parent_spouse_name` | name | 100.0% (2/2) | 100.0% (2/2) | Clean extraction |
| `phone` | phone | 100.0% (2/2) | 100.0% (2/2) | Clean extraction |
| `readback_confirmation` | yes_no | 100.0% (1/1) | 100.0% (1/1) | Clean extraction |
| `taluk` | text | 100.0% (1/1) | 100.0% (1/1) | Clean extraction |
| `village` | text | 100.0% (1/1) | 100.0% (1/1) | Clean extraction |

---

## 3. Accuracy Breakdown by Difficulty

| Difficulty | Dataset | Total Items | Correct | Accuracy |
|---|---|---:|---:|---:|
| **Easy** | Dev | 19 | 19 | 100.0% |
| **Medium** | Dev | 18 | 18 | 100.0% |
| **Hard** | Dev | 16 | 15 | 93.8% |
| **Easy** | Held-out | 10 | 10 | 100.0% |
| **Medium** | Held-out | 9 | 8 | 88.9% |
| **Hard** | Held-out | 6 | 6 | 100.0% |

---

## 4. Failure Analysis

### 1. `phone` (Dev Item #36, Hard)
- **Spoken:** `"zero zero zero zero zero zero zero zero zero zero one"` (11 zeros/ones spoken)
- **Expected:** `"00000 00001"` (10-digit formatted string)
- **Extracted:** `"00000000001"` (11 raw digits)
- **Validator Error:** `INVALID_LENGTH` ("Phone number must be exactly 10 digits")
- **Root Cause & Rationale:** The spoken utterance contains 11 spoken digits (`zero` repeated 10 times + `one`). The extractor extracted all 11 digits correctly, but the Indian phone validator rightly rejected it. In production, this triggers `needsConfirmation: true` and prompts the user for re-entry.

### 2. `applicant_name` (Held-out Item #7, Medium)
- **Spoken:** `"K. Muthulakshmi"`
- **Expected:** `"K. Demo Muthulakshmi"`
- **Extracted:** `"K. Muthulakshmi"`
- **Validator Status:** `VALID`
- **Root Cause & Rationale:** The synthetic fixture ground truth contained a clerical discrepancy: the word `"Demo"` was included in `expected` but absent from `spoken`. The extractor correctly extracted the actual spoken words `"K. Muthulakshmi"`. Because the held-out set is strictly read-only for evaluation integrity, the fixture was **not** edited.

### 3. Baseline Failures Resolved in Phase 9 (`district` & `taluk`)
- **Baseline Behavior:** Transcripts like `"Sample district"` yielded `"Sample district"` instead of `"Sample"`, and `"Test taluk"` yielded `"Test taluk"` instead of `"Test"`.
- **Pipeline Fix:** `server/llm/extractors/text.js` now strips common administrative suffixes (`district`, `taluk`, `dt`, `tk`, `வட்டம்`, `மாவட்டம்`) and spoken lead-in phrases (`en ooru`, `ooru`). Both fields improved from 80.0% to 100.0% in the dev set.

---

## 5. Confidence & Confirmation Policy

Solli implements a transparent, multi-signal confidence and confirmation policy (`server/llm/confidence.js`):

### 1. Confidence Evaluation Signals
Confidence begins at `1.0` and is adjusted based on heuristic risk indicators:
1. **Normalisation Edits (-0.10):** Transcripts requiring extensive cleaning, filler removal, or noise stripping indicate acoustic degradation.
2. **Detected Self-Corrections (-0.15):** When speech markers like *"illai"*, *"wait"*, *"no no"*, or *"sorry"* are detected, the speaker revised their answer mid-utterance.
3. **Choice Similarity Gap (-0.15):** Levenshtein distance matches on `choice` fields that are not exact token matches.
4. **Validation Status (Zero):** Any extraction that fails schema validation immediately sets `confidence = 0.0` and `needsConfirmation = true`.

### 2. Confirmation Trigger Conditions
A field extraction flags `needsConfirmation = true` if **ANY** of the following conditions hold:
- **Calibrated Confidence:** `confidence < CONFIRM_THRESHOLD` (where `CONFIRM_THRESHOLD = 0.8` defined in `server/config.js`).
- **Form Schema Policy:** The field definition in `server/forms/pension.json` defines `confirm: "always"` (enforced for `applicant_name`, `date_of_birth`, `aadhaar`, `bank_account`, `phone`, `address`).
- **Self-Correction Detected:** Any detected speech self-correction (`isCorrection: true`).

---

## 6. Real Transcript Collector (`/dev/collect`)

To transition from synthetic fixtures to empirical data, Phase 9 introduces a dedicated in-app collector accessible only during local development (`import.meta.env.DEV === true`):

1. **Route `/dev/collect`:** Displays pension form fields, an expected value input, and audio recording controls.
2. **Backend API `POST /api/dev/samples`:** Accepts `{ field_id, transcript, expected, condition, speaker, timestamp }`, validates payload size (< 2 KB), and appends records to `samples/real_transcripts.json`.
3. **Safety & Privacy:**
   - Prominent banner: *"Say FAKE data only. Never read real Aadhaar, phone or bank numbers."*
   - Audio files are strictly discarded after transcription (zero audio retention).
   - `samples/real_*` and `.env` are permanently git-ignored.
4. **Evaluation Command:**
   ```bash
   npm run extract:eval -- --set real
   ```

---

## 7. Honest Limitations

1. **Synthetic Bias in Baseline Fixtures:** The 53 dev and 25 held-out fixtures are synthetic text samples generated during development. They contain clean syntax, uniform pacing, and standard spelling.
2. **Prisma Acoustic Realities:** Live Prisma v2.5 transcripts exhibit phonetic drift (e.g., spelling Tamil names in phonetic English, inserting unexpected space breaks in multi-digit numbers, or generating noise tokens like `[laughter]`).
3. **Empirical Validation Plan:** Real accuracy numbers cannot be finalized on synthetic fixtures alone. Solli requires a minimum of 20–30 real recordings collected across quiet and noisy environments via `/dev/collect` before hackathon submission.
