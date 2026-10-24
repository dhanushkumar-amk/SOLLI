# Gnani AI usage

## Models and Roles

| Model | Role in Solli | Endpoint / Access | Format & Config | Fallback if Unavailable |
|---|---|---|---|---|
| **Prisma v2.5** | Converts recorded Tamil-English voice into text for form filling. | `POST https://api.vachana.ai/stt/v3` | 16 kHz mono 16-bit PCM WAV via browser Web Audio API; `format=transcribe`, `language_code=ta-IN` | Use prepared fake transcripts for fallback demo. |
| **Timbre v3.0** | Synthesizes Tamil-English question prompts and read-backs. | `POST https://api.vachana.ai/api/v1/tts/inference` | `timbre-v3.0`, voice `Shivani` (or `Lakshmi`), `language=ta-IN`, container `wav` (24 kHz linear PCM) | Show text on screen and let the operator read aloud. |
| **Evon v3.3** | Reasoning LLM (30B MoE) for field value extraction, self-correction, and commands. | Swappable provider architecture (`server/llm/`): Route A (`rules`), Route B (`evon-api`), Route C (`evon-selfhost`). | Schema-constrained JSON extraction; reasoning mode OFF for latency | Automatic fallback to `server/llm/rules.js` on error or 8s timeout. Zero app crashes. |

## Audio Architecture & Format Decision
- **Why Browser-side WAV?** The browser's native `MediaRecorder` typically outputs `audio/webm;codecs=opus` or `audio/ogg`. However, the Gnani Prisma STT API specifies support for `WAV, MP3, OGG, FLAC, AAC, M4A` (WebM is not accepted).
- Rather than requiring heavy server-side transcoding (such as `ffmpeg`), audio is recorded directly in the browser using the Web Audio API (`AudioContext`), resampled to 16,000 Hz mono 16-bit PCM, and packaged as a standard WAV `Blob`.
- Auto-stops after `MAX_AUDIO_SECONDS = 15`.

## Endpoints & Latencies
- STT REST: `POST https://api.vachana.ai/stt/v3` (Typical latency: 400ms – 1200ms depending on audio clip length).
- TTS REST: `POST https://api.vachana.ai/api/v1/tts/inference` (Typical latency: 350ms – 800ms for short sentences).
- LLM Extraction: `server/llm/` (<1ms for rules baseline, estimated 400–1200ms for Evon routes).
