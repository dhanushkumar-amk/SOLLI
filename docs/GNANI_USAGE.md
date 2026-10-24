# Gnani AI usage

| Model | Where it is used in Solli | What happens if it is unavailable |
|---|---|---|
| Prisma v2.5 | Converts each recorded Tamil-English answer into text for the form flow. | Voice input cannot be demonstrated live; use prepared fake transcripts only for a fallback demo. |
| Timbre v3.0 | Reads questions and the completed answers aloud. | Show the same text on screen and let the operator read it aloud. |
| Evon v3.3 | Optionally reasons over ambiguous transcripts to suggest a field value. | Use the rule-based `extractField(field, transcript)` fallback in `server/extract.js`. By day 8 of the build, decide between waitlist access, self-hosting the open weights, or staying with rules. |

Evon is not required for the core prototype. Prisma is speech to text, Timbre is text to speech, and Evon is a reasoning LLM with 128K context and 11 Indian languages.
