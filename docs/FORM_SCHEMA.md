# Solli Form Schema Specification

> **Status:** `[NATIVE SPEAKER REVIEW NEEDED]`  
> The schema, field list, Tamil wording, and read-back templates are drafts based on Tamil Nadu Social Security Pension Scheme conventions. Coordinates and printed layout details remain `UNCLEAR - ask user` until an official blank source PDF is supplied in Phase 14.

---

## 1. Overview
The form definition JSON file (e.g. `server/forms/pension.json`) is the **single source of truth** for:
1. Which questions are asked in the voice flow and in what sequence.
2. The exact Tamil and English prompt, help, and read-back templates.
3. How user answers are validated (types, lengths, ranges, regex).
4. Which fields require explicit confirmation (`always`, `if_uncertain`, `never`).
5. Which fields are sensitive and must be masked on screen and in logs.
6. Where and how fields are rendered on the printed PDF.
7. Any conditional questions (`dependsOn`).

The engine is **completely stateless**: answers are passed as arguments and are never stored on disk or database.

---

## 2. Top-Level Schema

```json
{
  "id": "pension",
  "title": "Old-Age Pension Application",
  "titleTa": "முதியோர் உதவித்தொகை விண்ணப்பம்",
  "language": "ta-IN",
  "version": "1.0.0",
  "source": "UNCLEAR - ask user (Generic draft based on Tamil Nadu Social Security Pension Scheme)",
  "disclaimer": "PROTOTYPE ONLY: This application uses fake sample data for demonstration. It does not submit to any government portal or authority.",
  "fields": [ /* Array of Field Objects */ ]
}
```

| Property | Type | Description |
|---|---|---|
| `id` | `string` | Unique identifier for the form (e.g., `"pension"`). |
| `title` | `string` | English title of the form. |
| `titleTa` | `string` | Tamil title of the form. |
| `language` | `string` | Primary BCP-47 locale code (`"ta-IN"`). |
| `version` | `string` | Semantic version string (`"1.0.0"`). |
| `source` | `string` | Source department / scheme as printed (marked `UNCLEAR` until verified). |
| `disclaimer` | `string` | Explicit notice indicating prototype status and no live submission. |
| `fields` | `Field[]` | Ordered array of form field definitions. |

---

## 3. Field Object Specification

Each element in `fields[]` conforms to the following schema:

```json
{
  "id": "applicant_name",
  "order": 1,
  "type": "name",
  "required": true,
  "spoken": true,
  "labels": {
    "printed": "விண்ணப்பதாரர் பெயர் / Name of Applicant",
    "en": "Applicant Name",
    "ta": "விண்ணப்பதாரர் பெயர்"
  },
  "question": {
    "ta": "உங்கள் பெயர் என்ன?",
    "taRoman": "Ungal peyar enna?",
    "en": "What is your name?"
  },
  "helpPrompt": {
    "ta": "மெதுவாக முழுப் பெயரை சொல்லுங்கள்.",
    "taRoman": "Medhuvaaga muzhu peyarai sollungal.",
    "en": "Please say your full name slowly."
  },
  "readback": {
    "ta": "உங்கள் பெயர் {value}. சரியா?",
    "en": "Your name is {value}. Is this correct?"
  },
  "validation": {
    "rule": "name",
    "min": 2,
    "max": 60
  },
  "errorMessage": {
    "ta": "செல்லுபடியாகும் பெயரை உள்ளிடவும் (2-60 எழுத்துகள்).",
    "en": "Please enter a valid name (2-60 characters, letters and initials only)."
  },
  "confirm": "always",
  "sensitive": false,
  "pdf": {
    "page": 1,
    "kind": "line",
    "boxes": null,
    "split": null,
    "coords": null
  },
  "dependsOn": null
}
```

### Property Details

| Key | Type | Allowed Values / Constraints |
|---|---|---|
| `id` | `string` | Unique snake_case identifier matching `FORM_FIELDS.md`. |
| `order` | `integer` | 1-based sequential ordering. Must be strictly unique across fields. |
| `type` | `string` | `text`, `name`, `date`, `number`, `phone`, `aadhaar`, `bank_account`, `ifsc`, `yes_no`, `choice`, `address` |
| `required` | `boolean` | `true` if mandatory for form submission. |
| `spoken` | `boolean` | `true` if asked aloud in voice flow. If `false`, `skipReason` is required. |
| `skipReason` | `string \| null` | Reason for skipping voice flow (e.g., `"photo"`, `"signature"`, `"office use"`). |
| `labels` | `object` | `{ printed: string, en: string, ta: string }` |
| `question` | `object \| null` | `{ ta: string, taRoman: string, en: string }` (Required if `spoken: true`). |
| `helpPrompt` | `object \| null` | `{ ta: string, taRoman: string, en: string }` Spoken on silence/confusion. |
| `readback` | `object \| null` | `{ ta: string, en: string }` Template containing `{value}` placeholder. |
| `validation` | `object` | Pure format validation rules (`rule`, `min`, `max`, `length`, `pattern`, `choices`). |
| `errorMessage` | `object` | `{ ta: string, en: string }` Friendly localized error messages. |
| `confirm` | `string` | `"always" \| "if_uncertain" \| "never"`. Always for `name`, `date_of_birth`, `aadhaar`, `bank_account`, `phone`. |
| `sensitive` | `boolean` | `true` for Aadhaar, bank accounts, and phone numbers. Triggers masking on screen and logs. |
| `pdf` | `object` | `{ page: number, kind: "line" \| "boxes" \| "tick", boxes: number \| null, split: string[] \| null, coords: null }`. Note: `coords` are measured in Phase 14; never invented. |
| `dependsOn` | `object \| null` | Optional `{ field: string, equals: any }` conditional dependency. |

---

## 4. Privacy & Masking Policy
- Any field marked `"sensitive": true` must be masked using `maskValue(val, type)`:
  - **Aadhaar**: Displays only last 4 digits (`•••• •••• 0001`).
  - **Bank Account**: Displays only last 4 digits (`••••••••••0001`).
  - **Phone**: Masks middle digits (`000•• ••001`).
- The server **never logs raw answers** for any route. Only route paths and field IDs are logged.
