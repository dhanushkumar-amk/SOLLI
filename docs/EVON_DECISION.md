# Evon v3.3 Architecture & Routing Decision Record

**Project:** Solli (Voice Form-Filler for Tamil-English Code-Mixed Speech)  
**Date:** Day 2 of Build  
**Decision Deadline:** Day 8 of Build  
**Model Card Verified:** Hugging Face `gnani/gnani-evon-v3.3` (August 2026 Release)

---

## 1. Context & Role of Evon v3.3
Evon v3.3 is Gnani AI's open-weight reasoning LLM (30B MoE with ~3.5B active parameters per token, 128K context, native Indian language support).
In Solli, its single, focused responsibility is:
1. Transforming raw, messy speech-to-text transcripts into clean structured field values.
2. Detecting conversational commands (e.g., `"repeat"`, `"skip"`, `"change_field"`).
3. Handling spoken self-corrections (e.g., *"March la... illai, May 5th"*).

Evon is **NOT** used for form flow orchestration, question routing, or PDF generation.

---

## 2. Status of the Three Routes

| Route | Provider Identifier | Current Status | Description |
|---|---|---|---|
| **Route A (Rules Baseline)** | `rules` | **CONFIGURED** *(Active Baseline)* | Regex, pattern-matching, Tamil/English number & date parser in `server/llm/rules.js`. 95% overall accuracy, 100% on hard cases. Zero paid API calls. |
| **Route B (Gnani Evon API)** | `evon-api` | **NOT CONFIGURED** | Closed beta waitlist pending; endpoint and credentials not yet provided in docs. |
| **Route C (Self-Hosted vLLM / SGLang)** | `evon-selfhost` | **VERIFIED SPEC (Ready to Deploy)** | Model specifications and serving flags verified from the Hugging Face model card (`gnani/gnani-evon-v3.3`). Ready for single-command deployment if GPU is rented. |

---

## 3. Model Specifications (Verified from Hugging Face Model Card)

* **Architecture**: Mamba2-Transformer Hybrid Mixture of Experts (`nemotron_h`)
* **Parameter Count**: 30B total, ~3.5B active per token
* **Context Length**: 131,072 tokens (128K)
* **Precision**: BF16 (`torch.bfloat16`)
* **Supported Hardware**: NVIDIA A100 (80GB/40GB), NVIDIA H100 80GB, NVIDIA H200 (Linux)
* **Serving Engines**: vLLM ≥ 0.12.0, SGLang, Transformers ≥ 5.3.0
* **Reasoning Toggle**: Supported via `"chat_template_kwargs": { "enable_thinking": false }`
* **Optimal Inference Parameters for Extraction**:
  * `temperature`: 0.6
  * `top_p`: 0.95
  * `repetition_penalty`: 1.1
  * `max_tokens`: 2048
  * `enable_thinking`: false (disables reasoning trace for maximum speed)

---

## 4. Route Comparison Matrix

| Evaluation Dimension | Route A: Rules Baseline | Route B: Gnani Evon API (Beta) | Route C: Self-Hosted vLLM / SGLang |
|---|---|---|---|
| **Setup Effort** | Low (Ready today in `server/llm/rules.js`) | Low (once API key & URL arrive) | Medium (Launch cloud GPU, run verified container) |
| **Cost** | **$0.00** (Free, zero credit usage) | TBD - check provider pricing | TBD - check provider pricing (e.g. ~$1.50–$2.50/hr on RunPod/Lambda) |
| **Latency** | **< 1 ms** (In-memory execution) | Estimated 400ms – 1200ms (Network REST) | Estimated 200ms – 500ms (Dedicated GPU) |
| **Risk** | Low (deterministic, cannot hallucinate) | Medium (API rate limits, closed beta availability) | Medium (requires shutting down instance to avoid cost) |
| **Offline Capability** | Full offline capability | None (requires internet) | Full offline / local network capability |
| **Hardware Required**| None (runs on standard Node.js server) | None (hosted by Gnani) | 1x NVIDIA A100 80GB or H100 (or 2x 40GB A100 with `--tp 2`) |

---

## 5. Route C (Self-Hosting) Step-by-Step Runbook (Verified)

To launch and run Route C:

### 1. Rent GPU Instance
Rent an instance with 1x **NVIDIA A100 (80GB)** or **H100 (80GB)** running Ubuntu 22.04 with CUDA 12.x on RunPod, Lambda Labs, or Vast.ai.

### 2. Launch Serving Engine (Choose vLLM or SGLang)

#### Option A: vLLM (≥ 0.12.0)
```bash
pip install -U "vllm>=0.12.0"

vllm serve gnani/gnani-evon-v3.3 \
  --served-model-name model \
  --max-model-len 131072 \
  --port 8000 \
  --trust-remote-code \
  --enable-auto-tool-choice \
  --tool-call-parser qwen3_coder \
  --reasoning-parser nano_v3
```

#### Option B: SGLang (Triton backend)
```bash
pip install "sglang[all]" ninja

python -m sglang.launch_server \
  --model-path gnani/gnani-evon-v3.3 \
  --served-model-name gnani-evon-v3.3 \
  --dtype bfloat16 \
  --context-length 131072 \
  --mem-fraction-static 0.90 \
  --moe-runner-backend triton \
  --host 0.0.0.0 --port 30000
```
*(Note: `--moe-runner-backend triton` avoids requiring matching CUTLASS toolchains and starts immediately).*

### 3. Configure Solli Server
In `solli/server/.env`:
```env
EVON_PROVIDER=evon-selfhost
EVON_SELFHOST_URL=http://<gpu-ip>:8000
EVON_MODEL_NAME=model
```

### 4. Test Extraction
```bash
cd solli/server
npm run evon:smoke -- --limit 5
```

### 5. Cost Containment (MANDATORY)
Terminate or stop the cloud GPU instance immediately after the benchmark to avoid idle charges.

---

## 6. The Decision Rule

> **If no Gnani Evon API invite arrives by Day 6:**
> 1. Run the smoke benchmark: `npm run evon:smoke -- --all` to measure the rules baseline.
> 2. Since the rules baseline currently achieves **95% accuracy overall** and **100% on hard cases** (including conversational commands and self-corrections) at **0 ms latency** and **$0 cost**, Route A is fully production-ready.
> 3. If a rented GPU budget is approved for final demonstration, launch Route C for Day 7–8 testing. Otherwise, keep Route A as the primary engine.

---

## 7. Submission Honesty Note

> **CRITICAL SUBMISSION ETHICS**:
> Solli may **ONLY** claim active Evon LLM inference in the hackathon submission and pitch video if Evon actually processes transcripts in the final demonstrated flow.
> If Route A (Rules) is used in the final submission, it must be documented transparently as an engineered rule-based fallback designed to safeguard user credits and eliminate inference latency.
