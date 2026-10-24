# Phase 5 Manual Testing Guide: Prisma & Timbre Round Trip

This document outlines the step-by-step commands to test the Gnani AI speech integration (`/api/transcribe` and `/api/speak`).

---

## 1. Verify Health Check
Ensure the Express server is running and `GNANI_API_KEY` is loaded:

### PowerShell:
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get
```

### curl (bash / cmd):
```bash
curl -s http://localhost:5000/api/health
```

### Expected Output:
```json
{"status":"ok","keyLoaded":true,"gnaniConfigured":true}
```

---

## 2. Check Credit & Usage Stats
Inspect the in-memory call counter before and after testing:

### PowerShell:
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/stats" -Method Get
```

### curl:
```bash
curl -s http://localhost:5000/api/stats
```

### Expected Output:
```json
{
  "transcribe": { "calls": 0, "totalAudioSeconds": 0 },
  "speak": { "calls": 0, "totalCharacters": 0 }
}
```

---

## 3. Test Text-to-Speech (`POST /api/speak`)
Synthesizes speech using Gnani Timbre v3.0 (`Shivani` voice, `ta-IN` Tamil-English).

### PowerShell:
```powershell
$body = @{
    text = "உங்கள் பெயர் என்ன? What is your name?"
    voice = "Shivani"
    language = "ta-IN"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/speak" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body `
  -OutFile "output.wav"

Write-Host "Received output.wav ($(Get-Item output.wav | Select-Object -ExpandProperty Length) bytes)"
```

### curl:
```bash
curl -X POST http://localhost:5000/api/speak \
  -H "Content-Type: application/json" \
  -d '{"text": "உங்கள் பெயர் என்ன? What is your name?", "voice": "Shivani", "language": "ta-IN"}' \
  --output output.wav
```

### Expected Result:
- HTTP 200 OK
- `Content-Type: audio/wav`
- A playable WAV audio file (`output.wav`) of approximately 40,000–80,000 bytes.
- `/api/stats` shows `speak.calls` incremented by 1.

---

## 4. Test Speech-to-Text (`POST /api/transcribe`)
Transcribes an audio file using Gnani Prisma v2.5 (`ta-IN`).

### Generating a 1-second Test WAV:
```bash
node -e "
const fs = require('fs');
const sampleRate = 16000;
const durationSeconds = 1;
const numSamples = sampleRate * durationSeconds;
const buffer = Buffer.alloc(44 + numSamples * 2);
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + numSamples * 2, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(1, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * 2, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write('data', 36);
buffer.writeUInt32LE(numSamples * 2, 40);
fs.writeFileSync('sample_test.wav', buffer);
"
```

### PowerShell:
```powershell
$form = @{
    audio_file = Get-Item "sample_test.wav"
    language = "ta-IN"
}
Invoke-RestMethod -Uri "http://localhost:5000/api/transcribe" -Method Post -Form $form
```

### curl:
```bash
curl -X POST http://localhost:5000/api/transcribe \
  -F "audio_file=@sample_test.wav" \
  -F "language=ta-IN"
```

### Expected Result:
- HTTP 200 OK
- JSON response:
  ```json
  {
    "text": "",
    "latencyMs": 850
  }
  ```
  *(For synthetic tone or silence, `text` will be empty or a hallucination-free empty string. For spoken Tamil-English, `text` contains the transcribed sentence).*
- `/api/stats` shows `transcribe.calls` incremented by 1.

---

## 5. Test Parameter Validation & Error Handling

### Exceeding 300 character limit on TTS:
```bash
curl -s -X POST http://localhost:5000/api/speak \
  -H "Content-Type: application/json" \
  -d '{"text": "'$(head -c 350 < /dev/zero | tr '\0' 'A')'"}'
```
**Expected Response:**
```json
{"error":"Text length (350) exceeds maximum limit of 300 characters"}
```
HTTP 400 Bad Request.

### Missing audio file on STT:
```bash
curl -s -X POST http://localhost:5000/api/transcribe
```
**Expected Response:**
```json
{"error":"Audio file is required (field name: audio or audio_file)"}
```
HTTP 400 Bad Request.
