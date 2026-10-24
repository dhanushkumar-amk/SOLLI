# Submission draft

## Project title

Solli — Say it, fill the form

## Problem

Elderly and first-time rural applicants can need help to complete paper forms. CSC and panchayat helpdesk operators often have to repeat questions, type answers, and review details one by one. Solli prototypes a guided voice workflow for one old-age pension application form.

## Who will use it

The deployers are Common Service Centres and panchayat helpdesks. A CSC/helpdesk operator can assist an elderly or rural first-time applicant as they answer form questions in Tamil-English code-mixed speech. The operator reviews the result before printing a PDF.

## Gnani AI models and APIs used

- **Prisma v2.5:** speech to text for recorded applicant answers.
- **Timbre v3.0:** text to speech for questions and read-back.
- **Evon v3.3:** optional reasoning support for ambiguous field extraction if access is available; the baseline fallback is rule-based extraction.

## My contribution

I, Dhanushkumar G, defined the product scope and will build the React/Vite frontend, Node/Express backend, form flow, rule-based fallback, evaluation plan, and demo using fake data only.

## 120-word written project explanation

Solli is a mobile-friendly web prototype for Common Service Centres and panchayat helpdesks. It helps an elderly or first-time rural applicant complete one old-age pension application through Tamil-English code-mixed speech. The app asks a question, records an answer, converts speech to text with Prisma, and fills a reviewed field. Timbre reads questions and the completed answers back to the applicant. An operator can correct unclear details before Solli creates a printable PDF using fake sample data. Evon may assist with ambiguous extraction if access becomes available; a rule-based fallback keeps the core flow independent of it. Solli does not store personal data, submit to government portals, verify Aadhaar, or make eligibility decisions. The project is designed for a 60-second demonstration.
