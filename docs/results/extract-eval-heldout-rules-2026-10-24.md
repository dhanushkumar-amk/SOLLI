# Extraction Evaluation Report: HELDOUT (rules)

- **Date:** 2026-10-24T11:04:58.931Z
- **Dataset:** `heldout` (25 items)
- **Provider:** `rules`
- **Overall Accuracy:** **96.0%** (24/25)
- **Average Latency:** 0 ms

## Accuracy by Field

| Field ID | Correct | Total | Accuracy |
|---|---:|---:|---:|
| `aadhaar` | 2 | 2 | 100.0% |
| `address` | 2 | 2 | 100.0% |
| `applicant_name` | 2 | 3 | 66.7% |
| `bank_account` | 3 | 3 | 100.0% |
| `date_of_birth` | 3 | 3 | 100.0% |
| `district` | 1 | 1 | 100.0% |
| `gender` | 2 | 2 | 100.0% |
| `nominee` | 2 | 2 | 100.0% |
| `parent_spouse_name` | 2 | 2 | 100.0% |
| `phone` | 2 | 2 | 100.0% |
| `readback_confirmation` | 1 | 1 | 100.0% |
| `taluk` | 1 | 1 | 100.0% |
| `village` | 1 | 1 | 100.0% |

## Accuracy by Difficulty

| Difficulty | Correct | Total | Accuracy |
|---|---:|---:|---:|
| easy | 10 | 10 | 100.0% |
| hard | 6 | 6 | 100.0% |
| medium | 8 | 9 | 88.9% |

## Failures List (1)

| # | Field | Spoken | Expected | Got | Valid |
|---|---|---|---|---|---|
| 7 | `applicant_name` | "K. Muthulakshmi" | "K. Demo Muthulakshmi" | "K. Muthulakshmi" | true |
