# Evon Smoke Benchmark: rules (2026-10-24)

- **Provider**: `rules`
- **Total Tested**: 20 fixtures
- **Overall Accuracy**: **95%** (19/20)
- **Average Latency**: **0 ms**
- **Difficulty Breakdown**:
  - **EASY**: 100% (8/8)
  - **MEDIUM**: 86% (6/7)
  - **HARD**: 100% (5/5)

## Detailed Results

| # | Field | Spoken Transcript | Expected | Got | Correct? | Difficulty | Latency | Provider |
|---|---|---|---|---|---|---|---|---|
| 1 | `applicant_name` | "Demo Anbu One" | `Demo Anbu One` | `Demo Anbu One` | ✅ | easy | 1ms | `rules` |
| 2 | `applicant_name` | "K. Muthulakshmi" | `K. Demo Muthulakshmi` | `K. Muthulakshmi` | ❌ | medium | 0ms | `rules` |
| 3 | `applicant_name` | "uh Demo Balan Two" | `Demo Balan Two` | `Demo Balan Two` | ✅ | medium | 0ms | `rules` |
| 4 | `applicant_name` | "noise Demo Ezhil Five" | `Demo Ezhil Five` | `Demo Ezhil Five` | ✅ | hard | 0ms | `rules` |
| 5 | `applicant_name` | "Demo Farah Six" | `Demo Farah Six` | `Demo Farah Six` | ✅ | easy | 0ms | `rules` |
| 6 | `applicant_name` | "Demo Verylong Exampleperson Name" | `Demo Verylong Exampleperson Name` | `Demo Verylong Exampleperson Name` | ✅ | hard | 0ms | `rules` |
| 7 | `parent_spouse_name` | "Demo Parent One" | `Demo Parent One` | `Demo Parent One` | ✅ | easy | 0ms | `rules` |
| 8 | `parent_spouse_name` | "Demo Husband Six" | `Demo Husband Six` | `Demo Husband Six` | ✅ | easy | 0ms | `rules` |
| 9 | `parent_spouse_name` | "appa peru Demo Parent Two" | `Demo Parent Two` | `Demo Parent Two` | ✅ | medium | 0ms | `rules` |
| 10 | `parent_spouse_name` | "uh Demo Parent Three" | `Demo Parent Three` | `Demo Parent Three` | ✅ | medium | 0ms | `rules` |
| 11 | `parent_spouse_name` | "noise Demo Parent Four" | `Demo Parent Four` | `Demo Parent Four` | ✅ | hard | 0ms | `rules` |
| 12 | `parent_spouse_name` | "Demo Parent Five" | `Demo Parent Five` | `Demo Parent Five` | ✅ | easy | 0ms | `rules` |
| 13 | `date_of_birth` | "nineteen fifty-eight May five" | `1958-05-05` | `1958-05-05` | ✅ | medium | 1ms | `rules` |
| 14 | `date_of_birth` | "1958 la May 5" | `1958-05-05` | `1958-05-05` | ✅ | medium | 0ms | `rules` |
| 15 | `date_of_birth` | "May 5th 1958" | `1958-05-05` | `1958-05-05` | ✅ | easy | 0ms | `rules` |
| 16 | `date_of_birth` | "March la... illai, May 5 1958" | `1958-05-05` | `1958-05-05` | ✅ | hard | 0ms | `rules` |
| 17 | `date_of_birth` | "5 May 1958" | `1958-05-05` | `1958-05-05` | ✅ | easy | 0ms | `rules` |
| 18 | `date_of_birth` | "noise May five nineteen fifty eight" | `1958-05-05` | `1958-05-05` | ✅ | hard | 0ms | `rules` |
| 19 | `nominee` | "Demo Nominee One" | `Demo Nominee One` | `Demo Nominee One` | ✅ | easy | 0ms | `rules` |
| 20 | `nominee` | "en nominee Demo Nominee Two" | `Demo Nominee Two` | `Demo Nominee Two` | ✅ | medium | 0ms | `rules` |
