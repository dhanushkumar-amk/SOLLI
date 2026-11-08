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

1. **Enable Demo Mode:** Start the client with `VITE_DEMO_MODE=true npm --prefix client run dev` to display the demo banner and pause the automatic inactivity timer.
2. **Use Recommended Fake Personas:** Refer to `tests/fixtures/fake_applicants.json` for consistent test personas (e.g., *K. Muthu, DOB: 12/05/1958, Village: Melur*).
3. **Dimensions:** Capture at standard 16:9 desktop (1920×1080) or standard mobile kiosk resolution.
4. **File Format:** Save as clean, optimized PNG or WebP files in this directory (`docs/screenshots/`).
