# Solli &mdash; Real-World Architecture, Privacy & Deployment Guide

This document specifies the technical architecture for deploying **Solli (சொல்லி)** in production environments, covering **real-world web forms integration**, the **Chrome Extension Side Panel architecture**, and the **strict data privacy safeguards** protecting citizen personal data (Aadhaar, Phone, Bank Accounts).

---

## Table of Contents
1. [Core Design: Schema-Driven Form System](#1-core-design-schema-driven-form-system)
2. [Real-World Deployment Models](#2-real-world-deployment-models)
3. [Chrome Extension Side Panel Architecture](#3-chrome-extension-side-panel-architecture)
4. [Chrome Security Rules & Manifest V3 Compliance](#4-chrome-security-rules--manifest-v3-compliance)
5. [Data Privacy & Citizen Security Architecture](#5-data-privacy--citizen-security-architecture)
6. [Regulatory Compliance (Indian DPDP Act & UIDAI Aadhaar Regulations)](#6-regulatory-compliance)
7. [Step-by-Step Guide: Adding Any New Real-World Form](#7-step-by-step-guide-adding-any-new-real-world-form)

---

## 1. Core Design: Schema-Driven Form System

Solli's UI and conversation engine are **100% schema-driven**. Neither the React frontend nor the state machine is hardcoded to a single form. 

When a session initializes, it loads a JSON schema defining the fields, bilingual questions, readback sentences, and validation rules:

```
┌─────────────────────────────────┐
│ Form Definition (.json schema)  │
│  - Field IDs, Types, Orders     │
│  - Tamil / English Prompts      │
│  - Validation & Masking Rules   │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ Solli State Machine & Voice UI  │
│  - Speaks via Timbre TTS        │
│  - Records & Transcribes (STT)  │
│  - Verifies & Auto-Fills Target │
└─────────────────────────────────┘
```

---

## 2. Real-World Deployment Models

Solli supports three primary real-world deployment patterns:

### Model A: Physical Public Kiosks (CSC & Gram Panchayat Offices)
* **Hardware**: Touchscreen all-in-one terminal or tablet with a directional counter-top noise-cancelling microphone.
* **Operating Mode**: Chrome Kiosk Mode (`chrome.exe --kiosk https://solli.app`).
* **Experience**: Rural citizens walk up to the terminal, speak in Tamil or English, verify their details on the screen, and print out the completed application with a verification QR code.

### Model B: Mobile Web / Progressive Web App (PWA)
* **Hardware**: Citizens' own Android / iOS smartphones.
* **Operating Mode**: Mobile browser or PWA installed to home screen.
* **Experience**: Citizens fill out forms comfortably from home via voice, with a responsive Flutter-inspired mobile layout.

### Model C: Operator Chrome Extension (Live Portal Auto-Fill)
* **Hardware**: Helpdesk or e-Sevai operator desktop computer.
* **Operating Mode**: Chrome Extension docked in the Chrome Side Panel.
* **Experience**: The operator opens the government portal in Tab A. Solli opens in the Side Panel, conducts the voice interview with the citizen, and auto-types the answers directly into the active webpage's input boxes in real-time.

---

## 3. Chrome Extension Side Panel Architecture

To bridge Solli with third-party websites (e.g. TN e-District, university admission portals, bank account pages), Solli utilizes Chrome's **Side Panel API (`chrome.sidePanel`)** in Manifest V3.

```
┌────────────────────────────────────────────────────────────────────────┐
│ GOOGLE CHROME BROWSER WINDOW                                           │
│                                                                        │
│  ACTIVE TAB: https://tnesevai.tn.gov.in        │ SOLLI SIDE PANEL      │
│ ┌──────────────────────────────────────────────┼─────────────────────┐ │
│ │                                              │ 🗣️ Solli • சொல்லி   │ │
│ │ 1. விண்ணப்பதாரர் பெயர் / Name:               │ ─────────────────── │ │
│ │    [ Muthu Kumar                   ] ◄───────┼─ 🎙️ "Muthu Kumar"   │ │
│ │                                              │    (Recorded &      │ │
│ │ 2. அலைபேசி எண் / Mobile No:                 │     Transcribed)    │ │
│ │    [ 9876543210                    ] ◄───────┼─ 🔊 "Your name is   │ │
│ │                                              │    Muthu Kumar.     │ │
│ │ 3. ஆதார் எண் / Aadhaar:                       │    Is this correct?"│ │
│ │    [ 1234 5678 9012                ] ◄───────┼─ [✓ Yes] [✕ No]     │ │
│ └──────────────────────────────────────────────┴─────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Communication Flow:
1. **Activation**: Operator clicks the extension icon; `background.js` opens `index.html` in the Side Panel.
2. **DOM Detection**: `contentScript.js` inspects `document.querySelectorAll('input, select, textarea')` on the active webpage.
3. **Voice Interview**: Solli asks questions sequentially via Timbre TTS and captures answers with Prisma STT.
4. **Target Injection**: Upon confirmation, Solli sends a message to the active tab:
   ```javascript
   chrome.tabs.sendMessage(activeTabId, {
     type: 'FILL_FIELD',
     selector: 'input[name="applicant_name"]',
     value: 'Muthu Kumar'
   });
   ```
5. **Synthetic Event Dispatch**: `contentScript.js` writes the value and dispatches synthetic `input` and `change` events so modern reactive frameworks (React, Vue, Angular) and legacy web forms detect the update:
   ```javascript
   element.value = message.value;
   element.dispatchEvent(new Event('input', { bubbles: true }));
   element.dispatchEvent(new Event('change', { bubbles: true }));
   ```

---

## 4. Chrome Security Rules & Manifest V3 Compliance

Google Chrome enforces strict security controls on extensions. Solli adheres to all Manifest V3 policies:

| Security Rule | Why Chrome Enforces It | How Solli Complies |
|---|---|---|
| **No Remote Scripts** | Prevents execution of malicious code injected from CDNs. | All React, CSS, and JS files are bundled locally into `dist/`. No external script tags exist. |
| **CORS & Host Permissions** | Prevents unauthorized cross-domain data leakage. | Backend endpoints are explicitly declared under `"host_permissions"` (`["http://localhost:5000/*", "https://*.solli.app/*"]`). |
| **ActiveTab Scoping** | Isolates background tabs from inspection. | Solli uses `"activeTab"`, granting DOM access strictly to the single tab the operator explicitly chooses to work on. |
| **Microphone Access** | Blocks background eavesdropping. | `getUserMedia` is invoked exclusively from the visible Side Panel UI with standard browser user consent. |

---

## 5. Data Privacy & Citizen Security Architecture

Handling sensitive identity data (Aadhaar, Phone, Bank Account Number) requires uncompromising privacy engineering:

### 1. In-Memory Zero-Persistence (RAM Only)
* **The Rule**: Citizen data is **never** saved to `localStorage`, `sessionStorage`, `indexedDB`, or `document.cookie`.
* **Verification**: Verified automatically by automated security regression tests in `client/tests/frontendKioskSafety.test.js`.
* **Outcome**: The instant a browser tab is closed or a session is cleared, all answers and transcripts cease to exist.

### 2. Ephemeral In-Flight Audio Processing
* Voice recordings are downsampled to 16 kHz 16-bit mono PCM in browser memory.
* Transmitted over encrypted **TLS 1.3 / HTTPS** to the backend STT endpoint.
* The server streams the buffer directly to the speech recognizer in-memory.
* **Audio files are NEVER saved to server disk or long-term databases.**

### 3. Visual Digit Masking ("Shoulder Surfing" Prevention)
* To protect citizens in crowded public offices, sensitive identifiers are masked on both the active screen and the final review table:
  $$\text{Aadhaar: } \bullet\bullet\bullet\bullet\ \bullet\bullet\bullet\bullet\ 9012$$
  $$\text{Bank Account: } \bullet\bullet\bullet\bullet\bullet\bullet\ 3456$$
* Only the last 4 digits are revealed for verification.

### 4. Acoustic Privacy & Silent Tap Confirmation
* Solli chunks numbers into natural Indian cadence ($4+4+4$ for Aadhaar, $5+5$ for Phone) and speaks confirmation read-backs quietly.
* Citizens can tap prominent on-screen **`[✓ Yes]`** / **`[✕ No]`** buttons instead of loudly shouting numbers in public.

### 5. Automated Kiosk Inactivity Watchdog
* If a citizen walks away without finishing:
  1. An inactivity timer tracks user interaction.
  2. At **3 minutes** of idle time, an assertive 20-second countdown warning modal appears.
  3. If unacknowledged, Solli executes `RESTART`: **100% of in-memory data is purged**, and the screen resets to the blank Welcome screen for the next applicant.

---

## 6. Regulatory Compliance

Solli is designed to comply with Indian data protection laws:

### Digital Personal Data Protection (DPDP) Act, 2023
* **Purpose Limitation (Sec. 7)**: Citizen data is processed exclusively for the form requested by the citizen.
* **Data Minimization**: No analytics tracking (Google Analytics, Meta Pixel, third-party cookies) exists in the application.
* **Right to Erasure (Sec. 12)**: The **"Finish & Clear Data / முடித்து அழிக்கவும்"** action provides instant, total erasure of all session state on demand.

### UIDAI Aadhaar Regulations
* Full Aadhaar numbers are never displayed on screens or printed on public summary cards without masking.
* Aadhaar biometric authentication is not performed; only demographic form field population is handled.

---

## 7. Step-by-Step Guide: Adding Any New Real-World Form

To support a new real-world form (e.g. College Admission, Ration Card, Community Certificate):

### Step 1: Create the Schema File
Create `server/forms/<form_id>.json`:

```json
{
  "id": "college_admission",
  "title": "College Admission Application",
  "titleTa": "கல்லூரி சேர்க்கை விண்ணப்பம்",
  "language": "ta-IN",
  "fields": [
    {
      "id": "student_name",
      "type": "name",
      "required": true,
      "spoken": true,
      "labels": {
        "en": "Student Full Name",
        "ta": "மாணவர் பெயர்"
      },
      "question": {
        "ta": "மாணவரின் முழு பெயர் என்ன?",
        "en": "What is the student's full name?"
      },
      "readback": {
        "ta": "பெயர் {value}. சரியா?",
        "en": "Name is {value}. Is this correct?"
      },
      "validation": { "rule": "name", "min": 2, "max": 60 },
      "confirm": "always",
      "sensitive": false
    },
    {
      "id": "phone_number",
      "type": "phone",
      "required": true,
      "spoken": true,
      "labels": {
        "en": "Contact Mobile Number",
        "ta": "அலைபேசி எண்"
      },
      "question": {
        "ta": "உங்கள் பத்து இலக்க அலைபேசி எண் என்ன?",
        "en": "What is your 10-digit mobile number?"
      },
      "readback": {
        "ta": "அலைபேசி எண் {value}. சரியா?",
        "en": "Phone number is {value}. Is this correct?"
      },
      "validation": { "rule": "phone" },
      "confirm": "always",
      "sensitive": true
    }
  ]
}
```

### Step 2: Register the Form in the Server
In `server/forms/formEngine.js`, add the new form ID to the available forms catalog:
```javascript
export const AVAILABLE_FORMS = ['pension', 'college_admission', 'ration_card'];
```

### Step 3: Select or Switch the Form in the Frontend
Call `fetchForm('college_admission')` to load the new schema. Solli's voice engine and Flutter UI immediately adapt to conduct the new interview without changing any React components!

