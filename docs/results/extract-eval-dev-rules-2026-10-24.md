# Extraction Evaluation Report: DEV (rules)

- **Date:** 2026-10-24T11:04:51.587Z
- **Dataset:** `dev` (53 items)
- **Provider:** `rules`
- **Overall Accuracy:** **98.1%** (52/53)
- **Average Latency:** 0 ms

## Accuracy by Field

| Field ID | Correct | Total | Accuracy |
|---|---:|---:|---:|
| `aadhaar` | 4 | 4 | 100.0% |
| `address` | 4 | 4 | 100.0% |
| `applicant_name` | 3 | 3 | 100.0% |
| `bank_account` | 3 | 3 | 100.0% |
| `date_of_birth` | 3 | 3 | 100.0% |
| `district` | 5 | 5 | 100.0% |
| `gender` | 4 | 4 | 100.0% |
| `nominee` | 4 | 4 | 100.0% |
| `parent_spouse_name` | 4 | 4 | 100.0% |
| `phone` | 3 | 4 | 75.0% |
| `readback_confirmation` | 5 | 5 | 100.0% |
| `taluk` | 5 | 5 | 100.0% |
| `village` | 5 | 5 | 100.0% |

## Accuracy by Difficulty

| Difficulty | Correct | Total | Accuracy |
|---|---:|---:|---:|
| easy | 19 | 19 | 100.0% |
| hard | 15 | 16 | 93.8% |
| medium | 18 | 18 | 100.0% |

## Failures List (1)

| # | Field | Spoken | Expected | Got | Valid |
|---|---|---|---|---|---|
| 36 | `phone` | "zero zero zero zero zero zero zero zero zero zero one" | "00000 00001" | "00000000001" | false |
