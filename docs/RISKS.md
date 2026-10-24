# Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Evon access does not arrive | High | Medium | Keep `extract.js` rule-based; make the core demo work without Evon. |
| Browser audio format is not accepted by an API | Low | High | **Mitigated in Phase 5**: Browser uses Web Audio API to record and downsample audio directly to 16 kHz mono 16-bit PCM WAV before upload; no ffmpeg needed on server. |
| Noisy audio lowers accuracy | High | High | Test clean/noisy samples, add retry and operator review, and report results honestly. |
| The 5,000 credits are exhausted | Medium | High | Use short fake recordings, log usage locally without personal data, and reserve credits for the final demo. |
| Shared-link microphone requires HTTPS | Medium | Medium | Demo on localhost or an HTTPS host; test microphone permission before recording. |
| Names and numbers are misheard | High | High | Ask for confirmation, show the text, validate formats, and allow operator correction. |
| Demo overclaims capability | Medium | High | Use the safety checklist and state that the app is a prototype that does not submit forms. |
| Time runs out before a stable demo | High | High | Freeze scope to one form and one correction; cut PWA/Evon work before core flow work. |
