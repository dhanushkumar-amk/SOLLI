# Spoken Numbers, Dates, and Identifiers Report (Phase 10)

**Date:** 2026-10-24  
**Project:** Solli (Tamil-English Voice Form-Filler)  
**Evaluation Provider:** `rules` (zero live API credits consumed)  
**Phase Scope:** `date`, `number`, `phone`, `aadhaar`, `bank_account`, `ifsc`, and spelled-out names.

---

## 1. Executive Summary & Evaluation Metrics

Phase 10 focused on eliminating fragile regex extraction for numeric and calendar fields. Prisma speech-to-text outputs diverse patterns: spoken English and Tamil words, grouped digits, split pauses, repetitions ("double", "triple"), and partial utterances.

**Core Policy:** Long numbers and sensitive identity fields are **never accepted silently**. Every sensitive field (`phone`, `aadhaar`, `bank_account`, `date_of_birth`, `ifsc`) enforces `confirm: "always"`, requires explicit user confirmation, and groups digits for natural rhythm during Timbre speech synthesis.

### Baseline vs After Pipeline (Phase 10 Fields Only)
*Fields evaluated: `date_of_birth` (date), `phone` (phone), `aadhaar` (aadhaar), `bank_account` (bank_account)*

| Dataset | Sample Size | Baseline Accuracy | After Pipeline Accuracy | Delta | Avg Latency |
|---|---|---|---|---|---|
| **Development (`dev`)** | 14 items | 92.9% (13/14) | **100.0%** (14/14) | **+7.1%** | < 1 ms |
| **Held-out (`heldout`)** | 10 items | 100.0% (10/10) | **100.0%** (10/10) | **+0.0%** | < 1 ms |
| **Real Transcripts (`real`)** | 6 items | 100.0% (1/1) | **100.0%** (6/6) | N/A | ~1 ms |

### Overall Form Accuracy Across All Fields (Phase 9 + Phase 10)

| Dataset | Total Fixtures | Accuracy | Correct | Failed | Status |
|---|---|---:|---:|---:|---|
| **Development (`dev`)** | 53 items | **100.0%** | 53 | 0 | All fields pass |
| **Held-out (`heldout`)** | 25 items | **96.0%** | 24 | 1 | Held-out guard preserved; 0 data leakage |
| **Real Transcripts (`real`)** | 6 items | **100.0%** | 6 | 0 | Verified across 5 digit speech styles |

---

## 2. Accuracy by Field Type

### Development Set (`dev`, Phase 10 types)

| Field Type | Total | Baseline Correct | After Correct | After Accuracy | Status |
|---|---:|---:|---:|---:|---|
| `aadhaar` | 4 | 4 | 4 | 100.0% | Format-checked; 4+4+4 grouping |
| `bank_account` | 3 | 3 | 3 | 100.0% | Length-validated (9-18 digits) |
| `date` | 3 | 3 | 3 | 100.0% | Calendar and leap-year verified |
| `phone` | 4 | 3 | 4 | **100.0%** | **Fixed**: Handled 11-digit trunk prefix cleanly |

### Held-out Set (`heldout`, Phase 10 types)

| Field Type | Total | Baseline Correct | After Correct | After Accuracy |
|---|---:|---:|---:|---:|
| `aadhaar` | 2 | 2 | 2 | 100.0% |
| `bank_account` | 3 | 3 | 3 | 100.0% |
| `date` | 3 | 3 | 3 | 100.0% |
| `phone` | 2 | 2 | 2 | 100.0% |

### Real Transcripts Set (`real`, by Digit Style)

| Digit Speech Style | Example Utterance | Count | Accuracy |
|---|---|---:|---:|
| `digits` | "9876 5432 1098" | 1 | 100.0% |
| `words` | "nine eight seven six five four three two one zero" | 1 | 100.0% |
| `double_triple` | "double nine double eight double seven double six double five" | 1 | 100.0% |
| `grouped` | "1234 5678 9012" | 1 | 100.0% |
| `mixed` | "1958 la May 5" | 1 | 100.0% |

---

## 3. Top Failures Analysis & Resolutions

### 1. 11-Digit Spoken Phone Strings (Dev Item #36, Resolved)
- **Transcript:** `"zero zero zero zero zero zero zero zero zero zero one"`
- **Baseline Issue:** The speaker uttered an 11-digit sequence with a leading trunk zero (`0`). The baseline parser extracted all 11 digits without trimming the trunk call prefix, triggering an `INVALID_LENGTH` validator failure.
- **Phase 10 Resolution:** The phone extractor (`server/llm/extractors/phone.js`) detects 11-digit sequences starting with trunk `0` and normalizes them to standard 10-digit Indian mobile formats (`00000 00001`). Dev accuracy reached 100%.

### 2. Spoken Compound Years (e.g., "nineteen fifty-eight", Resolved)
- **Baseline Issue:** When applicants spoke "nineteen fifty-eight May five", extracting the day token often failed because the compound year wasn't stripped from the day tokenizer.
- **Phase 10 Resolution:** `server/llm/extractors/date.js` tracks the exact raw matched phrase ("nineteen fifty-eight") and strips it before parsing the day token.

### 3. Speech Self-Corrections in Dates (Resolved)
- **Transcript:** `"March la... illai, May 5 1958"`
- **Baseline Issue:** Date parsing scanned tokens from left to right, matching "March" before noticing the self-correction marker.
- **Phase 10 Resolution:** Runs the normalisation pipeline before date parsing, cleanly extracting the revised month ("May") and flagging `isCorrection: true` and `needsConfirmation: true`.

### 4. Spelled-out Names with Syllable Pauses (Resolved)
- **Transcript:** `"K space M U T H U"`
- **Phase 10 Resolution:** `extractSpelledName` concatenates spelled letters, handles "space" / "gap" separators, turns "dot" into standard initial notation (`K.`), and title-cases Latin letters (`K. Muthu`).

### 5. Held-out Discrepancy (Heldout Item #7)
- **Spoken:** `"K. Muthulakshmi"`
- **Expected:** `"K. Demo Muthulakshmi"`
- **Extracted:** `"K. Muthulakshmi"` (Valid format)
- **Integrity Rule:** In accordance with evaluation rules, the held-out dataset was not modified. The single mismatch is a fixture artifact where the speaker never uttered the word "Demo".

---

## 4. Spoken Digit-Handling & Confirmation Policy

### 1. "Never Accept Long Numbers Silently"
In rural pension applications, mishearing an Aadhaar number or Bank IFSC results in rejected pension disbursements. Solli enforces:
1. **Mandatory Confirmation (`confirm: "always"`):** All sensitive fields (`phone`, `aadhaar`, `bank_account`, `date_of_birth`, `ifsc`) require affirmative read-back before final submission.
2. **Chunked Readback with Natural Pauses:**
   - Phone: 5 + 5 (`98765, 43210`) or 3 + 3 + 4.
   - Aadhaar: 4 + 4 + 4 (`1234, 5678, 9012`).
   - Bank Account: Groups of 4 (`1234, 5678, 9012, 345`).
   - Timbre TTS uses comma-delimited digit words to introduce natural speech rhythm without proprietary SSML tags.
3. **Partial Digit Capture:**
   If an applicant speaks fewer digits than required (e.g., 6 digits for phone), the extractor returns `{ partial: true, have: 6, need: 4 }`. The client loop speaks:
   > *"6 எண்கள் கேட்டன. மீதமுள்ள 4 எண்களை சொல்லுங்கள்."*  
   > *"I heard 6 digits. Please say the remaining 4."*  
   The state machine appends the next utterance without restarting the question (limited to 3 attempts before marking `needsOperatorHelp`).
4. **Age-Only Guard:**
   If the applicant speaks only an age ("enakku 70 vayasu"), Solli returns `{ type: "age_only", age: 70, value: null }` and **never fabricates a birth date**.
5. **Century Ambiguity in 2-Digit Years:**
   Two-digit years (e.g., "58") return `{ twoDigitCandidates: ["1958", "2058"], needsConfirmation: true }`.

---

## 5. Confidence Scoring Thresholds

`server/llm/confidence.js` applies calibrated penalties based on structural risk factors:

| Risk Factor | Penalty / Ceiling | Effect |
|---|---|---|
| **Failed Validator** | Capped at `0.40` | Forces `needsConfirmation: true` |
| **Digit Count Mismatch** | Capped at `0.40` | Forces `needsConfirmation: true` |
| **Parser Ambiguity** | Capped at `0.70` | Forces `needsConfirmation: true` |
| **DD/MM vs MM/DD Ambiguity** (both <= 12) | Capped at `0.70` | Forces `needsConfirmation: true` |
| **Partial Digit Capture** | Fixed at `0.60` | Loops for remaining digits |
| **Speech Self-Correction** | -0.10 penalty | Forces `needsConfirmation: true` |
| **Uncertainty Threshold** | `< 0.80` | Triggers voice confirmation prompt |

---

## 6. Honest Limitations

1. **Lexicon Coverage:** Tamil spoken number words (`server/llm/numbers/lexicon.js`) are documented as a **starting list**. Regional dialect variations in colloquial Tamil (e.g., Kongu or Nellai speech) may use variations not yet covered.
2. **Synthetic vs Real Transcripts:** High synthetic fixture accuracy (100% on Dev) does not substitute for real acoustic variety. Continuous validation using `/dev/collect` across noisy conditions is essential.
3. **No External Verification:** All number validators perform structural and format checks only. They do not claim live identity verification against UIDAI or NPCI databases.
