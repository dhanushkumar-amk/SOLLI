# Solli Confirmation & Read-Back Policy

> **Specification:** Phase 11 Confirmation Matrix & Spoken Read-Back Architecture  
> **Status:** Implemented in `server/forms/confirmPolicy.js` and `server/forms/formEngine.js`.

---

## 1. Confirmation Decision Matrix

The confirmation engine uses pure function `shouldConfirm(field, extractionResult, threshold = 0.8)`.

| `field.confirm` Setting | Extraction Status | Confidence | Self-Correction Detected? | Result: `shouldConfirm` | Rationale |
|---|---|---|---|---|---|
| `always` | Valid | Any (0.0 – 1.0) | Any | **`true`** | Critical fields (Phone, Aadhaar, Bank Account, DOB, Applicant Name) must always be verified by the applicant. |
| `always` | Invalid | Any | Any | **`true`** | Invalid input requires user verification/re-prompting. |
| `if_uncertain` (default) | Valid | $\ge 0.8$ | No | **`false`** | Confident extraction of standard non-critical field; saves credits and user time. |
| `if_uncertain` (default) | Valid | $< 0.8$ | No | **`true`** | Low confidence indicates potential transcription noise or acoustic ambiguity. |
| `if_uncertain` (default) | Valid | Any | **Yes** | **`true`** | Applicant corrected themselves (e.g., "Madurai illa Salem"); confirmation ensures corrected target is accurate. |
| `if_uncertain` (default) | Invalid | Any | Any | **`true`** | Validation failure requires re-evaluation or confirmation. |
| `never` | Valid | $\ge 0.8$ | No | **`false`** | Explicitly non-confirmed field (e.g. standard choice or simple filler). |
| `never` | Valid | $< 0.5$ | No | **`true`** | Severe acoustic uncertainty overrides `never` to prevent erroneous storage. |
| `never` | Valid | Any | **Yes** | **`true`** | Self-correction overrides `never` to verify the revised answer. |
| `never` | Invalid | Any | Any | **`true`** | Invalid input cannot be silently recorded. |

---

## 2. Spoken Read-Back Formatting Rules

All read-backs are generated from the field's schema `readback` templates in `server/forms/pension.json`.

1. **Character Budget:**
   - Every per-field read-back is strictly constrained to **under 200 characters** (typically 60–140 characters).
   - Only **one field** is included per read-back to keep cognitive load minimal for elderly users.
2. **Date of Birth:**
   - Spoken as **Day, Month Name, Year**:
     - English: `15 May 1958`
     - Tamil: `15 மே 1958`
   - Formatted via `formatDateForReadback(dateStr, lang)`.
3. **Phone Numbers:**
   - Formatted into groups of 5+5 digits separated by commas for natural Timbre speech rhythm:
     - Tamil: `ஒன்பது எட்டு ஏழு ஆறு ஐந்து, நான்கு மூன்று இரண்டு ஒன்று பூஜ்ஜியம்`
     - English: `nine eight seven six five, four three two one zero`
4. **Aadhaar Numbers:**
   - Formatted into three groups of 4 digits separated by commas (`4+4+4`):
     - Tamil: `ஒன்பது எட்டு ஏழு ஆறு, ஐந்து நான்கு மூன்று இரண்டு, ஒன்று பூஜ்ஜியம் ஒன்பது எட்டு`
5. **Bank Account Numbers:**
   - Formatted into groups of 4 digits separated by commas (`4+4+4+...`).

---

## 3. Privacy & Security Trade-Off: Spoken Full vs On-Screen Masking

### The Trade-off
- **On-Screen Display:** Sensitive identifiers (Phone, Aadhaar, Bank Account) are strictly **masked on-screen** (e.g., `•••• •••• 9012`), displaying only the last 4 digits to prevent shoulder-surfing in public kiosks or common areas.
- **Spoken Read-Back:** The spoken audio says **all digits** by default (`READBACK_SPEAK_FULL_SENSITIVE = true`).

### Rationale
An elderly applicant or village operator cannot verify a misrecognized bank account or Aadhaar number if the audio only speaks "last four digits are 9012". An error in the first 8 digits would result in pension disbursement failure. Because speech synthesis is played via phone earpiece or in a private application desk, full spoken verification is necessary for correctness. If application is run in an open public loud-speaker environment, `READBACK_SPEAK_FULL_SENSITIVE=false` can be configured in `.env`.

---

## 4. TTS Cache Separation Strategy

To protect the project's **5,000 credit budget**:
1. **Dynamic Value (No-Cache):** The read-back text containing the user's specific value is split from the trailing confirmation question. The value portion is marked `sensitive: true, noCache: true` and is synthesized live.
2. **Static Question (Cached):** The question prompt (`"இது சரியா? ஆம் அல்லது இல்லை என்று சொல்லுங்கள்."` / `"Is this correct? Please say yes or no."`) is static and cached in memory. After Field 1, this prompt returns a **100% cache HIT** (0 credits consumed, 3ms latency).
3. **On-Screen Yes/No Tapping:** Large, touch-friendly on-screen buttons (**"👍 ஆம் / Yes"** and **"👎 இல்லை / No"**) are always visible during confirmation. Tapping these buttons bypasses STT speech recognition entirely, consuming 0 credits with zero transcription latency.

---

## 5. Confirmation Loop Guardrails

1. **Silence Policy:**
   Silence during confirmation is strictly treated as **unclear**, **never as "yes"**. An unconfirmed sensitive value is never treated as confirmed.
2. **Ambiguous Answers:**
   Utterances containing both affirmative and negative cues (e.g., `"sari, aana illai"`, `"yes but no"`) are flagged as ambiguous (`confidence < 0.6`) and trigger clarification.
3. **Maximum Rounds:**
   A maximum of **3 confirmation rounds** is permitted per field. If the applicant cannot confirm or remains unclear after 3 attempts, the field is marked `needsOperatorHelp: true`, flagged with an alert at the top of the review screen, and the conversation advances without looping indefinitely.
