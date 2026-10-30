import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function crc32(buf) {
  let table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c
  }
  let crc = 0 ^ -1
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff]
  }
  return (crc ^ -1) >>> 0
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  const crcVal = crc32(Buffer.concat([typeBuf, data]))
  crcBuf.writeUInt32BE(crcVal, 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function createSolliPng(size) {
  // RGBA buffer with filter byte 0 per line
  const raw = Buffer.alloc((size * 4 + 1) * size)
  
  // Background: Deep calm blue #1e40af (RGB: 30, 64, 175)
  // Rounded circle in center: radius ~ size * 0.42
  const center = size / 2
  const rBg = size * 0.44
  const micR = size * 0.16
  
  for (let y = 0; y < size; y++) {
    const rowOffset = y * (size * 4 + 1)
    raw[rowOffset] = 0 // Filter type 0 (None)
    for (let x = 0; x < size; x++) {
      const pxOffset = rowOffset + 1 + x * 4
      const dx = x - center
      const dy = y - center
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      // Outer rounded badge
      if (dist <= rBg) {
        // Deep blue background #1e40af
        let r = 30
        let g = 64
        let b = 175
        let a = 255
        
        // Microphone head in center: white circle at center - offset
        const headDy = dy + size * 0.05
        const headDist = Math.sqrt(dx * dx + headDy * headDy)
        
        // Draw mic shape (white icon #ffffff)
        // Capsule: -size*0.08 <= dx <= size*0.08 and -size*0.18 <= dy <= size*0.02
        const inCapsule = Math.abs(dx) <= size * 0.09 && dy >= -size * 0.18 && dy <= size * 0.04
        const inHead = headDist <= size * 0.09 && dy <= -size * 0.05
        const inBottomHead = Math.sqrt(dx * dx + (dy - size * 0.04) * (dy - size * 0.04)) <= size * 0.09
        
        // Arc around capsule: distance from center between size*0.13 and size*0.16 for dy > -size*0.04 and dy < size*0.12
        const inArc = dist >= size * 0.13 && dist <= size * 0.17 && dy >= -size * 0.02 && dy <= size * 0.12
        
        // Stand line: -size*0.02 <= dx <= size*0.02 and size*0.12 <= dy <= size*0.22
        const inStand = Math.abs(dx) <= size * 0.025 && dy >= size * 0.12 && dy <= size * 0.22
        
        // Base line: -size*0.1 <= dx <= size*0.1 and size*0.21 <= dy <= size*0.25
        const inBase = Math.abs(dx) <= size * 0.12 && dy >= size * 0.21 && dy <= size * 0.25
        
        if (inCapsule || inHead || inBottomHead || inArc || inStand || inBase) {
          r = 255
          g = 255
          b = 255
        }
        
        raw[pxOffset] = r
        raw[pxOffset + 1] = g
        raw[pxOffset + 2] = b
        raw[pxOffset + 3] = a
      } else {
        // Transparent outside circular badge
        raw[pxOffset] = 0
        raw[pxOffset + 1] = 0
        raw[pxOffset + 2] = 0
        raw[pxOffset + 3] = 0
      }
    }
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(size, 0)
  ihdrData.writeUInt32BE(size, 4)
  ihdrData[8] = 8 // bit depth
  ihdrData[9] = 6 // RGBA
  ihdrData[10] = 0 // deflate
  ihdrData[11] = 0 // filter
  ihdrData[12] = 0 // non-interlaced
  const ihdrChunk = makeChunk('IHDR', ihdrData)
  
  const compressed = zlib.deflateSync(raw)
  const idatChunk = makeChunk('IDAT', compressed)
  
  const iendChunk = makeChunk('IEND', Buffer.alloc(0))
  
  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk])
}

const outDir = path.resolve(__dirname, '../public')
const p192 = createSolliPng(192)
fs.writeFileSync(path.join(outDir, 'icon-192.png'), p192)
console.log('Generated icon-192.png (' + p192.length + ' bytes)')

const p512 = createSolliPng(512)
fs.writeFileSync(path.join(outDir, 'icon-512.png'), p512)
console.log('Generated icon-512.png (' + p512.length + ' bytes)')
