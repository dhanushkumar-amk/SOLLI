---
name: cloudflare-ui
description: "Design and build web applications following the Cloudflare Enterprise Design System (Cloudflare Orange #F38020, Cloudflare Blue #0051C3, Dark Console Chrome, DNS Records Table, Cloudflare Radar, and Edge Telemetry)."
version: 1.0.0
---

# Cloudflare Enterprise Design System Skill

This skill defines the visual architecture, component specifications, color tokens, and layout guidelines for building interfaces that look and feel like Cloudflare's flagship enterprise dashboard (`dash.cloudflare.com`).

---

## 1. Core Visual Tokens

### Colors
- **Cloudflare Orange (Primary)**: `#F38020` (Hover: `#E56B0E`, Active: `#D45B00`, Tint: `#FFF7ED`, Border: `#FDBA74`)
- **Cloudflare Blue (Secondary / Accent)**: `#0051C3` (Hover: `#00419E`, Tint: `#EFF6FF`, Border: `#BFDBFE`)
- **Dark Console Header**: `#131722` or `#1E1E24` (Border: `#2A2F3D`, Muted Text: `#94A3B8`)
- **Dashboard Canvas**: `#F8FAFC` or `#F9FAFB`
- **Card / Surface Background**: `#FFFFFF`
- **Borders & Dividers**: `#E2E8F0` or `#E5E7EB` (Subtle 1px solid)
- **Text Primary**: `#0F172A` (Slate 900, High-contrast, sharp)
- **Text Secondary**: `#475569` (Slate 600)
- **Text Muted / Code**: `#64748B` (Slate 500)
- **Status Emerald**: `#10B981` (Live / Proxied / Verified)
- **Status Amber**: `#F59E0B` (Pending / Review)
- **Status Rose**: `#EF4444` (Error / Blocked)

### Typography
- **Font Stack**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, sans-serif
- **Code / Record Values**: `ui-monospace`, `SFMono-Regular`, `Menlo`, `Monaco`, `Consolas`, monospace
- **Scale**:
  - H1 / Dashboard Title: 18px / 20px, font-bold (700), tight tracking
  - Section Head: 14px / 15px, font-semibold (600)
  - Table Rows & Labels: 12px / 13px, font-normal / font-medium
  - Pill Badges & Telemetry: 11px, font-mono, uppercase or sentence case

---

## 2. Key Components & Layout Patterns

### A. Top Console Bar (Cloudflare Chrome)
- Height: 52px.
- Background: `#131722` (Deep Navy / Charcoal).
- Elements:
  - Official Cloudflare Cloud Logo (Orange `#F38020` with white cutout).
  - Breadcrumb: `Account` > `Zone / Domain` > `Application`.
  - Search bar (`Cmd+K`) with dark input `#1E2433`.
  - Live Status Pills: `Status: Operational` (emerald dot), `Edge Latency: <15ms`, `Zero Data Retention`.
  - Quick action buttons (Audio, Reset, Settings, Notifications).

### B. Sub-Navigation Tabs Bar
- Border-bottom: `1px solid #E2E8F0`.
- Tabs: `Overview`, `DNS / Voice Records`, `Security Rules`, `Edge Workers`, `Radar Telemetry`, `Settings`.
- Active state: `border-b-2 border-[#F38020] text-slate-900 font-semibold`.

### C. DNS & Records Table View (Left Pane / 65% Width)
Instead of generic detached inputs, form data is structured as **Edge Records**:
- Toolbar: Search records, Add record, Export CSV/PDF, Filter by status.
- Table columns:
  - `TYPE`: Pill badge (`TEXT`, `AADHAAR`, `PHONE`, `BANK`, `SELECT`)
  - `NAME / FIELD`: Primary Tamil label + English descriptor
  - `CONTENT / VALUE`: Real-time recognized text or formatted value
  - `PROXY STATUS`: Orange Cloud (`Proxied via Voice Engine`)
  - `STATUS`: Verified (`✓ Active`), Spoken (`● Listening`), or Empty
  - `ACTION`: Edit / Re-record button

### D. Radar & Edge Voice Companion (Right Pane / 35% Width)
A docked Cloudflare side panel featuring:
- **Radar Acoustic Visualizer**: Concentric wave animation pulsing during microphone capture.
- **Active Question Card**: High-contrast question with step counter (`Record 3 of 10`).
- **Readback Confirmation Console**:
  - Recognized string in high-contrast monospaced badge.
  - Action buttons:
    - Primary: `Confirm Record (ஆம் / சரி)` in `#F38020`
    - Secondary: `Re-take (இல்லை / மாற்று)` in outline slate
- **Edge Telemetry Metrics**:
  - Streaming latency, packet loss, Artha Evon model inference time.
- **Deploy / Download Button**:
  - Cloudflare style button for downloading official signed PDF certificates.

---

## 3. Best Practices
1. **Zero Awkward White Space**: Use wide containers (`max-w-[1600px]` or full bleed with padding) so table rows and side panels occupy the screen efficiently.
2. **Subtle Elevation**: Use `1px border border-slate-200` with micro-shadows (`box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05)`). Avoid heavy drop shadows.
3. **High Density**: Enterprise users appreciate high information density — 12-13px typography for table records, 8px padding on rows, compact icons.

