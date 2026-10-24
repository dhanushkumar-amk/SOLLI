# Project description

## Project title

Solli — Say it, fill the form

## Problem

Elderly and first-time rural applicants can need assistance with paper forms. CSC and panchayat helpdesk operators often repeat questions, type answers, and review details manually. Solli is a focused prototype for one old-age pension application workflow.

## Who will use it

Common Service Centres, panchayat helpdesks, NGOs, and bank branches are the intended deployers. An operator assists an elderly or rural first-time applicant during the form conversation and reviews the result before printing.

## Gnani AI models and APIs used

| Model | Exact role in Solli |
|---|---|
| Prisma v2.5 | Speech to text for the applicant's recorded Tamil-English mixed answer. [CONFIRM AFTER PHASE 5] |
| Timbre v3.0 | Text to speech for form questions and completed-answer read-back. [CONFIRM AFTER PHASE 11] |
| Evon v3.3 | Optional reasoning for ambiguous field extraction; rule-based extraction remains the fallback while API access is uncertain. [CONFIRM AFTER PHASE 6] |

## My contribution

I, Dhanushkumar G, am building this solo: product design, React/Vite frontend, Node/Express backend, voice pipeline, rule-based fallback, testing, and the demo.

## Written project explanation

Solli is a mobile-friendly web prototype for organisations that help people complete forms. It focuses on one old-age pension application for an elderly or first-time rural applicant using Tamil-English mixed speech. [CONFIRM AFTER PHASE 8] The planned flow asks one question at a time, records an answer, and uses Prisma for speech to text. [CONFIRM AFTER PHASE 11] Timbre will read questions and completed answers back so the applicant or operator can catch mistakes. [CONFIRM AFTER PHASE 12] A correction path will handle unclear details before review. [CONFIRM AFTER PHASE 14] Solli will create a printable PDF from fake demo data. Evon may support ambiguous extraction if closed-beta access arrives; a rule-based fallback keeps the core flow independent of it. The prototype is designed for CSCs and panchayat helpdesks, not government submission.

## Honest limitations

- This is a prototype and uses fake sample data only.
- [CONFIRM AFTER PHASE 14] It prepares a form for printing but does not submit it to any government or other portal.
- Testing will use a small sample; no accuracy claim is made yet.
- The exact official blank form is TBD in Phase 4.
- Evon API access is uncertain; the fallback is rule-based extraction.
