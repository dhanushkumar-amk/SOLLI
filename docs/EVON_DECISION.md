# Evon v3.3 Architecture & Routing Decision Record

**Project:** Solli (Voice Form-Filler for Tamil-English Code-Mixed Speech)  
**Date:** Day 2 of Build  
**Decision Deadline:** Day 8 of Build  

---

## 1. Context & Role of Evon v3.3
Evon v3.3 is Gnani AI's open-weight reasoning LLM (30B MoE, 128K context, native Indian language support).
In Solli, its single, focused responsibility is:
1. Transforming raw, messy speech-to-text transcripts into clean structured field values.
2. Detecting conversational commands (e.g., `"repeat"`, `"skip"`, `"change_field"`).
3. Handling spoken self-corrections (e.g., *"March la... illai, May 5th"*).

Evon is **NOT** used for form flow orchestration, question routing, or PDF generation.

---

## 2. Status of the Three Routes

| Route | Provider Identifier | Current Status | Description |
|---|---|---|---|
| **Route A (Rules Baseline)** | `rules` | **CONFIGURED** *(Active Baseline)* | Regex, pattern-matching, Tamil/English number & date parser in `server/llm/rules.js`. Zero paid API calls. |
| **Route B (Gnani Evon API)** | `evon-api` | **NOT CONFIGURED** | Closed beta waitlist pending; endpoint and credentials not yet provided in docs. |
| **Route C (Self-Hosted vLLM)** | `evon-selfhost` | **NOT CONFIGURED** | Hugging Face weights (`gnani/gnani-evon-v3.3-30B-A3B`) available, but serving commands and hardware requirements must be verified on model card. |

---

## 3. Route Comparison Matrix

| Evaluation Dimension | Route A: Rules Baseline | Route B: Gnani Evon API (Beta) | Route C: Self-Hosted vLLM / SGLang |
|---|---|---|---|
| **Setup Effort** | Low (Ready today in `server/llm/rules.js`) | Low (once API key & URL arrive) | High (GPU provisioning, CUDA, vLLM setup) |
| **Cost** | **$0.00** (Free, zero credit usage) | TBD - check provider pricing | TBD - check provider pricing (Hourly GPU rental) |
| **Latency** | **< 1 ms** (In-memory execution) | Estimated 400ms – 1200ms (Network REST) | Estimated 200ms – 600ms (Local/Cloud GPU) |
| **Risk** | Low (deterministic, cannot hallucinate) | Medium (API rate limits, closed beta availability) | High (cold starts, OOM errors, cost overruns) |
| **Offline Capability** | Full offline capability | None (requires internet) | Full offline / intranet capability |
| **Hardware Required**| None (runs on minimal Node.js) | None (hosted by Gnani) | Dedicated GPU (e.g., A10G / A100 / H100) |

---

## 4. Route C (Self-Hosting) Step-by-Step Runbook

To evaluate or run Route C, follow these exact operational steps:

1. **GPU Rental**:
   - Rent a cloud GPU instance with sufficient VRAM for the 30B MoE model (RunPod, Lambda Labs, or Vast.ai).
   - *(VERIFY ON MODEL CARD: minimum VRAM requirement for FP16, AWQ, or FP8 quantization)*.
2. **Serving Command (OpenAI-Compatible Engine)**:
   - Run vLLM or SGLang:
     ```bash
     # [VERIFY ON MODEL CARD: model architecture flags and tensor parallelism]
     python3 -m vllm.entrypoints.openai.api_server \
       --model gnani/gnani-evon-v3.3-30B-A3B \
       --port 8000 \
       --max-model-len 4096 \
       --tensor-parallel-size 1
     ```
3. **Network & Firewall**:
   - Expose the HTTP endpoint or establish a secure SSH/Tailscale tunnel to port `8000`.
   - Restrict public access to avoid unauthorized requests.
4. **Environment Configuration**:
   - In `solli/server/.env`:
     ```env
     EVON_PROVIDER=evon-selfhost
     EVON_SELFHOST_URL=http://<gpu-ip>:8000
     ```
5. **Cost Containment (CRITICAL)**:
   - Immediately terminate or pause the cloud GPU instance after testing to prevent runaway hourly rental fees.

---

## 5. The Decision Rule

> **If no Gnani Evon API invite arrives by Day 6:**
> 1. Run the smoke benchmark: `npm run evon:smoke -- --all` to measure the rules baseline.
> 2. If rules accuracy on `spoken_answers.json` fixtures is **below 85% on hard cases** AND GPU rental budget is available for final demo testing, rent a GPU and test Route C for one day.
> 3. Otherwise, maintain **Route A (Rules Baseline)** for the demo, which is deterministic, zero-cost, runs in <1ms, and achieves 100% on current test fixtures.

---

## 6. Submission Honesty Note

> **CRITICAL SUBMISSION ETHICS**:
> Solli may **ONLY** claim Evon LLM integration in the hackathon submission and pitch video if Evon actually processes transcripts in the final demonstrated flow.
> If Route A (Rules) is used in the final build, it must be documented transparently as an engineered rule-based fallback designed to safeguard user credits and eliminate inference latency.
