# Solli: Complete Project Description & PRD

## Name and Tagline

- **Name:** **Solli** (the name means "say it" in Tamil)
- **Tagline:** *Just say it. We'll fill the form.*
- **One line:** *Solli is a multilingual voice assistant that helps people who find forms hard to read or type fill them in by speaking in their own language.*
- **Status:** Independent Prototype · **436 / 436 Automated Tests Passing (100%)**
- **Creator:** Dhanushkumar G (Solo Project for the Great Indian AI Internship Challenge)

---

## 1. The Problem

Many people miss pensions, scholarships and other welfare benefits because of the paperwork, not because they are ineligible. Forms are long, written in formal language, and often in a language the person doesn't speak at home. Many applicants are elderly, have low vision, or can't type. They depend on middlemen who charge fees, make mistakes and sometimes take advantage of them. India has many languages, and most form tools support only one or two of them.

---

## 2. The Solution

Solli turns form filling into a spoken conversation. The applicant chooses their language, and Solli asks each question aloud in that language. The person answers by speaking, Solli understands the answer and fills the form field, and anything important is read back for confirmation. At the end, a review screen shows the whole form. No typing is needed.

---

## 3. How It Works

1. **Choose a language:** The applicant picks from 10 Indian languages (including a Tanglish option) on the first screen. The on-screen text and the voice both switch to that language.
2. **Solli asks:** Each question is spoken aloud in a natural voice.
3. **The person answers:** They speak freely, including mixed speech such as Tamil-English or Hindi-English.
4. **Solli understands:** Speech becomes text, and the text becomes a clean field value (a name, a date, a phone number).
5. **Solli confirms:** Names, dates and long numbers are read back, with numbers in small groups. The person says yes or no, or taps a button.
6. **The person controls the flow:** They can say commands such as *"repeat"*, *"go back"*, *"I don't know"* or *"change the village"*.
7. **Review:** A final screen lists every field with a status. Any field can be changed by voice or by tapping.
8. **Finish:** A printable PDF receipt of the completed form is generated, and all session data clears from volatile memory.

---

## 4. Multilingual by Design

- **Language selection screen** with 10 Indian languages and a code-mixed option.
- **Voice switches with the language:** The questions and read-backs are spoken in the chosen language.
- **Mixed speech supported:** People often switch between their language and English mid-sentence, and Solli is built to accept that.
- **One form definition, many languages:** Each question has text for each language, so adding a language means adding text and rules, not rebuilding the app.

> **Honest Note:**  
> *"Solli's voice and screen text are available in 10 Indian languages. Speech understanding was tested most thoroughly in **Tamil and English (including Tanglish)**. Other languages are a preview, and accuracy may vary."*

---

## 5. Full Feature List

### Voice and Language
- Speech to text for spoken answers
- Spoken questions and read-backs in a natural voice
- Language and voice switching across 10 Indian languages
- Code-mixed speech handling (e.g., Tanglish)
- Spoken number understanding (digits, number words, *"double five"*, lakh and crore)
- Flexible date understanding, including self-corrections

### Accuracy and Trust
- Read-back of important values, with phone, Aadhaar-style and bank numbers in small groups
- Yes/no confirmation by voice or on-screen buttons
- Silence or unclear speech is never treated as "yes"
- Limited retries (2 attempts), then the field is flagged for operator help
- Format validation for dates, phone numbers, identifiers and names (format checking only, no verification)

### Control & Corrections
- Voice commands: *repeat*, *skip*, *I don't know*, *go back*, *change a field*, *help*, *call the operator*, *start over*, *stop*
- Voice or tap editing on the review screen
- Risky commands such as *"start over"* always ask for confirmation

### Kiosk and Accessibility
- Large text, high-contrast mode, and font-size options
- Operator controls: mute voice, restart, resume, manual correction
- Live 12-bar audio level display while listening
- Inactivity timeout (60s) that automatically clears the session

### Privacy
- No personal data is saved to any database or to browser storage
- Answers exist only in volatile memory during the active session
- Sensitive values are masked on screen

---

## 6. Who It Is For

- **Organisations (the customer):** Common Service Centres, e-Sevai kendras, panchayat and ward offices, NGOs, bank branches and scheme helpdesks that help people apply every day.
- **Applicants (the end user):** Elderly people, first-time applicants, and anyone who can speak a language but can't easily type or read formal forms.
- **Operators:** Staff who supervise a kiosk or phone, adjust the screen, and correct fields when needed.

---

## 7. Built on Gnani AI

| Model | Role in Solli | Status |
|---|---|---|
| **Prisma v2.5** | Speech to text: understands the applicant's spoken answers | Active |
| **Timbre v3.0** | Text to speech: speaks the questions and read-backs in the chosen language | Active |
| **Evon v3.3** | Answer extraction currently uses a rule-based engine, and Evon LLM integration is planned. | Planned |

*The Gnani API key stays on the server and is never exposed to the browser.*

---

## 8. Technology

- **Frontend:** React 19 with Vite, mobile-first design, Tailwind CSS v4, Shadcn/UI, Geist & Geist Mono typography, and Ember Obsidian dark theme.
- **Backend:** Node.js with Express 5.1.
- **Understanding answers:** Rule-based extraction engine with local parsing and a swappable LLM layer.
- **Form definition:** One JSON schema holding fields, questions, validation and read-back text.
- **Output:** Finished printable PDF receipt generation (`pdf-lib` & `receiptGenerator`).
- **Testing:** **436 automated unit and integration tests (100% pass rate)**.

---

## 9. Privacy, Safety and Honesty

- **No applicant data is stored:** Answers live only in memory and are wiped after inactivity or when the session ends.
- **Fake data only:** All demos and tests use fake data only.
- **Format checking only:** Solli does not verify Aadhaar, phone or bank details. It checks format only.
- **No portal submissions:** Solli does not submit anything to any government portal. It prepares the form, and a person finishes the process.
- **Independent prototype:** Solli is an independent student prototype, **not an official government service**.

---

## 10. Results (Real Numbers Only)

- **Automated Tests:** **436 passing** across 61 test suites (0 failures).
- **Thoroughly Tested Speech:** Tamil (`ta-IN`) and English (`en-IN`), including Tanglish.
- **Test Invariants:** Numbers lexicon, digit chunking, yes/no contrast resolution, state machine transitions, and zero-PII client non-persistence.

---

## 11. Roadmap (Planned)

- **Browser Extension (Planned):** A Chrome MV3 extension that scans the fields of any web form and lets the person fill them by voice, with a match table showing confirmed values. Never submits automatically.
- **Additional Languages (Planned):** Proper testing and tuning for each additional Indian language.
- **More Schemes (Planned):** Support for scholarships, ration card updates, and additional civic forms.

---

## 12. About

Built by **Dhanushkumar G** as a solo project for the **Great Indian AI Internship Challenge**, using **Gnani AI**'s models.

`#GnaniAI` `#GreatIndianAIInternshipChallenge`
