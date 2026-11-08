<<<<<<< HEAD
# Screenshots and Architecture Diagrams for Solli

This folder contains high-resolution UI captures and architectural diagrams used across the repository and documentation.

> **Safety Notice:** All screenshots were captured in **Demo Mode** using synthetic fake sample data only. Never commit or capture real personal identification numbers, real phone numbers, or real citizen data.

---

## Catalog of Visual Assets

| File Name | Section in README | Description |
|---|---|---|
| [`hero-landing.png`](hero-landing.png) | Hero Showcase | Landing page hero showcasing the tagline, language badges, and live spoken session preview. |
| [`problem-solution.png`](problem-solution.png) | The Problem & The Solution | Side-by-side cards highlighting bureaucratic paperwork barriers and the conversational voice solution. |
| [`kiosk-app.png`](kiosk-app.png) | Who It Is For / Kiosk UI | Active voice kiosk interface (`/app`) showing the form fields ledger, progress counter, and Tamil voice panel. |
| [`how-it-works-diagram.png`](how-it-works-diagram.png) | How It Works | Handwritten chalkboard/napkin architectural diagram illustrating the 8-step conversational pipeline. |
| [`architecture-deep-dive.png`](architecture-deep-dive.png) | Architecture | High-Level Design (HLD) architecture deep dive detailing Client, Express Server, and Gnani Cloud tiers. |

---

## Capture Guidelines for Additional Screens
=======
# Screenshots Guide for Solli

This folder is reserved for application screenshots used in documentation, pitches, and the submission showcase.

> **Safety Notice:** All screenshots must be captured in **Demo Mode** using synthetic fake sample data only. Never capture real personal identification numbers, real phone numbers, or real applicant data.

---

## 5 Required Screenshots to Capture

Capture these 5 key screens from the running application:

### 1. `01-language-screen.png` — Language Selection Screen
- **Route:** `/app` (initial state)
- **What to capture:** The 10 Indian languages (+ Tanglish code-mixed) selection screen, showing native script typography (தமிழ், हिन्दी, etc.), voice indicator, and the prominent "Start" action.

### 2. `02-question-screen.png` — Active Voice Question Screen
- **Route:** `/app` (during an active question, e.g., name or date of birth)
- **What to capture:** Spoken prompt text in bilingual/chosen language, animated audio visualization / equalizer, microphone status banner ("Listening..."), and question counter.

### 3. `03-confirmation-screen.png` — Read-Back Confirmation Screen
- **Route:** `/app` (after answering a sensitive numeric field like phone or Aadhaar)
- **What to capture:** Masked sensitive identifier display (e.g., `XXXX 1234`), grouped chunked read-back status, and prominent on-screen **"👍 ஆம் / Yes"** and **"👎 இல்லை / No"** touch fallback buttons.

### 4. `04-review-screen.png` — Final Review Ledger
- **Route:** `/app` (at review state after answering all fields)
- **What to capture:** The structured review card showing all 12 spoken fields, masked values, green verification badges, individual "Edit" buttons, and the **"Speak a change"** voice editing button.

### 5. `05-operator-bar.png` — Operator Control Bar
- **Route:** `/app` (top bar or full view)
- **What to capture:** Operator controls including language switcher, **"Mute Voice"** toggle, **"Typed Test Mode"** toggle, **"Restart"** button, and accessibility controls (contrast and font size).

---

## Capture Guidelines
>>>>>>> 4c065ca7ed5e7af1ec134ff98f66d559ab417217

1. **Enable Demo Mode:** Start the client with `VITE_DEMO_MODE=true npm --prefix client run dev` to display the demo banner and pause the automatic inactivity timer.
2. **Use Recommended Fake Personas:** Refer to `tests/fixtures/fake_applicants.json` for consistent test personas (e.g., *K. Muthu, DOB: 12/05/1958, Village: Melur*).
3. **Dimensions:** Capture at standard 16:9 desktop (1920×1080) or standard mobile kiosk resolution.
<<<<<<< HEAD
4. **File Format:** Save as clean, optimized PNG or WebP files in this directory (`docs/screenshots/`).
=======
4. **File Format:** Save as standard PNG or WebP files in this directory (`docs/screenshots/`).
>>>>>>> 4c065ca7ed5e7af1ec134ff98f66d559ab417217
