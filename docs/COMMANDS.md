# Solli Voice Commands Specification

This document describes the voice command architecture, phrase tables, safety gating, and context rules implemented in Phase 12.

---

## 1. Design Philosophy: "False-Positives First"

For elderly and low-literacy users in rural and semi-urban Tamil Nadu, background chatter, hesitation sounds, and names or addresses often contain syllables that resemble command keywords (e.g. "Skandan", "back street", "next to temple", "chillara change illa").

**Golden Rule:** A command misheard as an answer, or an answer misheard as a command, must **never** destroy, overwrite, or corrupt applicant data.

### Defensive Core Principles
1. **Length Guard (`COMMAND_MAX_WORDS = 6`):** Any utterance longer than 6 words is strictly categorized as an answer or conversational statement, never a command.
2. **Context Gating:** In confirmation states (`listeningConfirm`, `speakingReadback`), only non-destructive conversational commands are accepted: `repeat`, `help`, and `operator`. All navigation commands (`skip`, `back`, `change_field`, `start_over`) are blocked.
3. **Freeform Text Strictness:** In `name`, `address`, and `text` fields, commands like `skip` and `dont_know` require short, exact phrases (<= 3 words) to prevent misclassifying compound proper nouns or directions.
4. **Negation Guard:** Phrases containing negation tokens (`illa`, `illai`, `not`, `vendam`, etc., such as `"chillara change illa"`) are prevented from triggering `change_field`.
5. **Data Preservation on Edit:** Selecting `change_field` preserves the previous answer in state. If an edit attempt is cancelled, interrupted, or fails validation, the prior valid answer remains untouched.
6. **Destructive Safety Confirmation:** `start_over` ALWAYS requires explicit confirmation via modal buttons or explicit voice confirmation ("Delete everything and start again?").

---

## 2. Supported Commands & Phrase Tables

> **Note:** The Tamil phrases below represent an initial curated starting list. Dialectal variations across Kongu, Nellai, Madurai, and Chennai Tamil should be verified with native speakers before wide deployment.

| Command | Purpose | Example Phrases (English, Roman Tamil, Tamil Script) | Allowed States | Safety Behavior |
| :--- | :--- | :--- | :--- | :--- |
| `repeat` | Replay current question or last read-back | "repeat", "again", "meendum sollunga", "thirumba sollunga", "மீண்டும்", "ரிப்பீட்" | `listening`, `listeningConfirm`, `review` | Replays cached question audio or generates read-back. Does not count as an attempt failure. |
| `skip` | Skip current field (if optional) | "skip", "next", "aduthadhu", "vittudunga", "தவிர்", "ஸ்கிப்" | `listening` (NOT allowed in confirm states) | Only permitted on optional fields (`required: false`, e.g. `nominee`). On required fields, Solli explains it is required. |
| `dont_know` | Mark field as unknown | "I don't know", "theriyadhu", "theriyala", "puriyala", "தெரியாது", "ஐ டோன்ட் நோ" | `listening` | Marks field as `needsOperatorHelp` with reason `"dont_know"`. Never hallucinates or guesses a value. |
| `back` | Return to previous spoken field | "back", "previous", "munnadi ponga", "முன்னாடி", "பின்னாடி" | `listening` | Re-asks previous field while keeping stored value visible. Halts safely at first field. |
| `change_field` | Edit a specific field by name/alias | "change the village", "ooru maathunga", "change phone", "மாத்துங்க", "சேஞ்ச் த வில்லேஜ்" | `listening`, `review` | Matches target against pension form field aliases. Prompts choice if ambiguous. Retains old value until new value is confirmed. |
| `help` | Hear field guidance | "help", "explain", "udhavi", "vilakkam", "உதவி", "ஹெல்ப்" | `listening`, `listeningConfirm` | Speaks field's `helpPrompt` then resumes listening. Does not advance question or penalize attempts. |
| `operator` | Request human staff intervention | "operator", "call operator", "adhigaari venum", "panithalar", "பணியாளர்", "ஆபரேட்டர்" | All states | Sets `needsOperatorHelp: true`, shows prominent "Operator Needed" banner, pauses voice loop until resumed. |
| `stop` | Pause conversation | "stop", "pause", "wait", "niruthunga", "நிறுத்து", "வெயிட்" | `listening`, `listeningConfirm` | Releases microphone, displays "Conversation Paused" overlay with Resume button. |
| `start_over` | Clear all answers and restart form | "start over", "restart", "delete all", "modhalla irundhu", "முதலில் இருந்து ஆரம்பி" | `listening`, `review` | **High risk.** Always prompts modal confirmation: "Delete everything and start again?". Only cancels on explicit confirmation. |

---

## 3. Field Targeting & Aliases

Voice field editing supports 100% of spoken fields in `server/forms/pension.json`. Targets are resolved using normalized Levenshtein similarity against:
- Canonical field ID (e.g. `applicant_name`)
- English label (e.g. `Applicant's Name`)
- Tamil label (e.g. `விண்ணப்பதாரர் பெயர்`)
- Printed form label
- Curated Roman & Tamil aliases in `lexicon.js`

### Spoken Fields Coverage: 12 / 12 Spoken Fields Covered
- `applicant_name`: name, peyar, per, vinnappadharar peyar, பெயர்
- `parent_spouse_name`: father, husband, appa, kanavar, thandhai, purushan, தந்தை
- `date_of_birth`: dob, birthday, pirandha thethi, pirandha thedhi, vayasu, age, பிறந்த தேதி
- `gender`: gender, sex, paalinam, aan pen, பாலினம்
- `address`: address, mugavari, veettu mugavari, door number, street, theru, முகவரி
- `village`: village, town, ooru, oor, gramam, kuppam, kandigai, கிராமம், வில்லேஜ்
- `taluk`: taluk, taluka, tehsil, vattam, தாலுகா, வட்டம்
- `district`: district, jilla, maavattam, mavattam, மாவட்டம், ஜில்லா
- `phone`: phone, mobile, contact number, cellphone, அலைபேசி, போன்
- `aadhaar`: aadhaar, aadhar, uida, uidai, aadhar card, ஆதார்
- `bank_account`: bank account, account number, vangi kanakku, கணக்கு எண், வங்கி
- `ifsc`: ifsc, ifsc code, bank branch code, ஐஎப்எஸ்சி, கிளையின் குறியீடு
- `nominee` (optional): nominee, nominee name, varisu, niyamanadharar, வாரிசு

### Ambiguity Resolution
If an utterance matches two candidate fields with nearly identical confidence (e.g. `"account"` matching `bank_account` vs general details, or `"number"` matching `phone` vs `aadhaar`), Solli:
1. Returns `ambiguous: true` with candidates `['bank_account', ...]`.
2. UI displays an on-screen dialog asking: *"Which one did you mean?"* with large tappable buttons.
3. If the user said generic "change" with no field specified, Solli prompts *"Which field?"* and displays a list of completed fields.

---

## 4. In-Answer Partial Corrections (`partial.js`)

When users self-correct inside an answer, Solli parses partial corrections safely:

1. **Whole-value contrast resolution:**
   - English: `"Madurai, not Salem"` -> extracts `"Madurai"`.
   - Tamil: `"Salem illa Madurai"` -> extracts `"Madurai"`.
2. **Digit-level corrections for numeric fields:**
   - Recognizes phrases like `"last digit is 7"`, `"first digit is 9"`, `"third digit is 4"`.
   - Modifies existing value in place (e.g. `9840123450` + `"last digit is 7"` -> `9840123457`).
   - **Safety Mandate:** Digit-level modifications **always** set `needsConfirmation: true` to ensure the full recalculated value is read back for verification.
3. **Safe Fallback:**
   - Any ambiguous or unparseable self-correction returns `{ handled: false }`. Solli re-prompts the entire field instead of guessing corrupted digits.

---

## 5. Review Screen Voice Editing

On the final review screen (`STATES.REVIEW`):
- A **"Speak a change"** button records an 8-second speech window.
- Runs `detectCommand` and `matchFieldTarget`.
- Immediately jumps the conversation flow to the targeted field.
- The applicant can re-speak their answer, confirm the read-back, and return immediately to the review screen with refreshed validation status.
- Tap-based Edit buttons remain available at all times as an accessible fallback.

---

## 6. Known Limitations & Future Work

1. **Dialect Phonology:** Certain Tamil rural pronunciations (e.g. `thirumbavum`, `oru kaal`, `pinbaadi`) need expanding in future testing.
2. **Acoustic Noise Overlaps:** Strong acoustic background speech in markets or buses can degrade STT phonetic clarity.
3. **Context Sensitivity:** Commands spoken in rapid succession without pauses between words may occasionally require the user to repeat.
