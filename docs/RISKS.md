# Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Evon access does not arrive | Low | Medium | **Mitigated in Phase 6**: Swappable provider architecture in `server/llm/` with automatic fallback to `server/llm/rules.js` on error or 8s timeout. Rules baseline tested at 95% accuracy on fixtures with zero credit usage. |
| Browser audio format is not accepted by an API | Low | High | **Mitigated in Phase 5**: Browser uses Web Audio API to record and downsample audio directly to 16 kHz mono 16-bit PCM WAV before upload; no ffmpeg needed on server. |
| Noisy audio lowers accuracy | High | High | **Mitigated in Phase 9**: Built dedicated normalisation pipeline (`server/llm/normalize.js`) stripping fillers, zero-width characters, discourse markers, and detecting speech self-corrections. Calibrated confidence policy triggers `needsConfirmation: true` when confidence < 0.8 or corrections are detected. Added `/dev/collect` to gather empirical noisy/quiet transcripts. |
| The 5,000 credits are exhausted | Medium | High | **Mitigated in Phase 8**: Server in-memory TTS cache (`server/ttsCache.js`) caches static question audio so repeated plays cost 0 credits (`X-Cache: HIT`). Server enforces hourly rate limit `MAX_LIVE_CALLS_PER_HOUR` (default 120 calls/hr) returning 429 to block runaway loops. Client includes typed test mode (`import.meta.env.DEV`) and "Mute voice" toggles to complete full forms with 0 live API calls. |
| Shared-link microphone requires HTTPS | Medium | Medium | Demo on localhost or an HTTPS host; test microphone permission before recording. |
| Names and numbers are misheard | High | High | **Mitigated in Phase 7 & 9**: Form definition enforces `confirm: "always"` on critical fields (name, date of birth, Aadhaar, bank account, phone, address). Dedicated extractors (`server/llm/extractors/`) preserve name initials ("K. Muthulakshmi"), clean administrative suffixes ("district", "taluk"), and match choices via Levenshtein edit distance. Validates format via pure regex/calendar validators, and strictly masks sensitive values (last 4 digits only). |
| Demo overclaims capability | Medium | High | Use the safety checklist and state that the app is a prototype that does not submit forms. |
| Time runs out before a stable demo | High | High | Freeze scope to one form and one correction; cut PWA/Evon work before core flow work. |
