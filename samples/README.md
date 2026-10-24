# Audio Samples Directory

This directory is reserved for local testing and audio format verification.

## Privacy & Competition Rules
- **No real voice recordings of other people** are committed to this repository.
- Any temporary recordings saved during development (`samples/real_*`) are excluded via `.gitignore`.

## Generating a Synthetic Test WAV File
To test `/api/transcribe` without recording real voices or spending credits unnecessarily, you can generate a short synthetic WAV file using Node.js:

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
buffer.writeUInt16LE(1, 20); // PCM
buffer.writeUInt16LE(1, 22); // mono
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * 2, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write('data', 36);
buffer.writeUInt32LE(numSamples * 2, 40);
// Generate a 440Hz tone
for (let i = 0; i < numSamples; i++) {
  const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0x3fff;
  buffer.writeInt16LE(Math.round(sample), 44 + i * 2);
}
fs.writeFileSync('samples/test_tone.wav', buffer);
console.log('Generated samples/test_tone.wav');
"
```
