# Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Evon access does not arrive | Low | Medium | **Mitigated in Phase 6**: Swappable provider architecture in `server/llm/` with automatic fallback to `server/llm/rules.js` on error or 8s timeout. Rules baseline tested at 95% accuracy on fixtures with zero credit usage. |
| Browser audio format is not accepted by an API | Low | High | **Mitigated in Phase 5**: Browser uses Web Audio API to record and downsample audio directly to 16 kHz mono 16-bit PCM WAV before upload; no ffmpeg needed on server. |
| Noisy audio lowers accuracy | High | High | Test clean/noisy samples, add retry and operator review, and report results honestly. |
| The 5,000 credits are exhausted | Medium | High | Use short fake recordings, log usage locally without personal data, and reserve credits for the final demo. |
| Shared-link microphone requires HTTPS | Medium | Medium | Demo on localhost or an HTTPS host; test microphone permission before recording. |
| Names and numbers are misheard | High | High | **Mitigated in Phase 7**: Form definition enforces `confirm: "always"` on critical fields (name, date of birth, Aadhaar, bank account, phone), reads back formatted values before proceeding, validates format via pure regex/calendar validators, and strictly masks sensitive values (last 4 digits only) on screen, logs, and summaries to prevent visual/shoulder-surfing errors. |
| Demo overclaims capability | Medium | High | Use the safety checklist and state that the app is a prototype that does not submit forms. |
| Time runs out before a stable demo | High | High | Freeze scope to one form and one correction; cut PWA/Evon work before core flow work. |
