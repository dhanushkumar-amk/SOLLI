# Solli scope

## Product definition

Solli is a mobile-friendly web prototype for CSCs and panchayat helpdesks that guides an applicant through one old-age pension form by voice and creates a printable PDF.

## Problem statement

Paper forms are difficult for many elderly and first-time rural applicants to complete without help. An operator often has to repeat questions, type answers, and check details manually. This can make a simple application feel slow and intimidating. Solli is designed to let a CSC operator or applicant speak each answer in Tamil-English code-mixed speech while the form is filled step by step. The result is reviewed before a printable PDF is created; it is not submitted to a government system.

## Users

### Deployer: Common Service Centres and panchayat helpdesks

These organisations can use Solli as a front-desk assistance tool for a single application workflow. They provide the device and ensure an operator is available when needed.

### Operator: CSC or helpdesk staff member

The operator starts the session, helps when a question or answer is unclear, reviews the completed fields, and prints the PDF. The operator is not replaced by the prototype.

### End applicant: elderly or rural first-time applicant

The applicant answers simple questions aloud in Tamil-English code-mixed speech, either independently or with operator help. The applicant can hear the answers read back before printing.

## MUST HAVE features

1. One old-age pension application flow using fake demo data.
2. Tamil-English code-mixed voice capture for each question.
3. Speech-to-text transcription through Prisma.
4. One-question-at-a-time mobile-friendly form flow.
5. Visible filled fields and a confidence/needs-review signal.
6. Text-to-speech questions and final read-back through Timbre.
7. A simple voice correction path for a field in the demo.
8. A printable PDF preview/export with no data storage.

## SHOULD HAVE features

1. Rule-based field extraction for common names, dates, numbers, and phone numbers.
2. Operator edit controls for every field.
3. Clear microphone, transcription, and retry states.
4. A PWA install prompt or installable configuration.
5. A small fake-data test set for clean and noisy speech checks.

## NICE TO HAVE features

1. Evon-assisted interpretation of ambiguous answers if access arrives in time.
2. A compact operator summary before PDF generation.
3. A short on-screen privacy notice.
4. A demo-only progress indicator.

## OUT OF SCOPE

- Submitting applications to government portals.
- Supporting multiple form types.
- User accounts or login.
- Databases or any persistent personal-data storage.
- A native Android or iOS app.
- Voice cloning or custom voices.
- Languages other than Tamil-English code-mixed speech.
- Real Aadhaar verification.
- Eligibility decisions, scheme rules, benefit calculations, or legal advice.
- OCR, document uploads, or document verification.
- Production deployment or a staff dashboard.

## Assumptions and honest limitations

- This is a hackathon prototype; it uses fake sample data only.
- The exact official blank form and its fields are TBD in Phase 4.
- The prototype creates a PDF but does not submit it anywhere.
- Speech and extraction accuracy will be measured on a small, non-representative sample.
- An operator remains available for corrections and unclear speech.
- Evon access is uncertain; rule-based extraction is the baseline fallback.
