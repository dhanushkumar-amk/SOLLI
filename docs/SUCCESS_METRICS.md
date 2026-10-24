# Success metrics

| Metric | Definition | How to measure |
|---|---|---|
| Field accuracy | Correct fields / total fields. | Compare each completed fake-data form with a prepared answer key after review. |
| Clean vs noisy audio accuracy | Field accuracy measured separately on quiet and deliberately noisy recordings. | Run the same fake prompts in both conditions and report both rates. |
| Average corrections per form | Total corrections requested / completed forms. | Count voice or operator edits made before PDF generation. |
| Voice vs typing completion time | Time from first question to reviewed form for voice, compared with typing the same fake data. | Time at least a few matched runs with a stopwatch. |
| Fields filled without operator help | Fields completed without an operator edit or prompt. | Divide unassisted completed fields by total fields. |

## Results to fill in

| Test date | Forms tested | Field accuracy | Clean accuracy | Noisy accuracy | Avg. corrections/form | Voice time | Typing time | Unassisted fields | Notes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 2026-10-24 | 78 fixtures (53 dev, 25 held-out) | **98.1% (Dev)** / **96.0% (Held-out)** | 100.0% (Easy/Med) | 93.8% (Hard) | 0.04 | N/A | N/A | 97.4% | Phase 9 rules pipeline with zero credit cost. Baseline was 94.3% (Dev) / 96.0% (Held-out). |
| 2026-10-24 | Phase 10 numbers & dates (14 dev, 10 held-out, 6 real) | **100.0% (Dev)** / **100.0% (Held-out)** / **100.0% (Real)** | 100.0% (Quiet) | 100.0% (Noisy) | 0.00 | N/A | N/A | 100.0% | Phase 10 number-word parser, chunked readback, and date extractors with zero credit cost. Overall form accuracy: 100.0% (Dev), 96.0% (Held-out). |
