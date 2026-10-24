import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Simple pseudo-random generator with fixed seed (Mulberry32)
function createSeededRandom(seed = 42) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle(array, rand) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function splitFixtures(seed = 42) {
  const rand = createSeededRandom(seed)

  const fixturesPath = path.resolve(__dirname, '../../tests/fixtures/spoken_answers.json')
  const rawData = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'))

  // Group by field_id and difficulty stratum
  const strata = new Map()
  for (const item of rawData) {
    const key = `${item.field_id}::${item.difficulty}`
    if (!strata.has(key)) strata.set(key, [])
    strata.get(key).push(item)
  }

  const devSet = []
  const heldoutSet = []

  // Stratified split: allocate ~70% of each stratum to dev, remainder to heldout
  for (const [key, items] of strata.entries()) {
    const shuffled = shuffle(items, rand)
    const heldoutCount = Math.max(0, Math.round(shuffled.length * 0.3))
    const devCount = shuffled.length - heldoutCount

    for (let i = 0; i < devCount; i++) {
      devSet.push(shuffled[i])
    }
    for (let i = devCount; i < shuffled.length; i++) {
      heldoutSet.push(shuffled[i])
    }
  }

  // Stable sort by field_id then difficulty
  const sortFn = (a, b) => {
    if (a.field_id !== b.field_id) return a.field_id.localeCompare(b.field_id)
    return a.difficulty.localeCompare(b.difficulty)
  }

  devSet.sort(sortFn)
  heldoutSet.sort(sortFn)

  const devPath = path.resolve(__dirname, '../../tests/fixtures/spoken_dev.json')
  const heldoutPath = path.resolve(__dirname, '../../tests/fixtures/spoken_heldout.json')

  fs.writeFileSync(devPath, JSON.stringify(devSet, null, 2), 'utf8')
  fs.writeFileSync(heldoutPath, JSON.stringify(heldoutSet, null, 2), 'utf8')

  // Mirror to root tests/fixtures if root exists
  const rootDevPath = path.resolve(__dirname, '../../../../tests/fixtures/spoken_dev.json')
  const rootHeldoutPath = path.resolve(__dirname, '../../../../tests/fixtures/spoken_heldout.json')
  if (fs.existsSync(path.dirname(rootDevPath))) {
    fs.writeFileSync(rootDevPath, JSON.stringify(devSet, null, 2), 'utf8')
    fs.writeFileSync(rootHeldoutPath, JSON.stringify(heldoutSet, null, 2), 'utf8')
  }

  console.log(`Stratified split complete (seed=${seed}):`)
  console.log(`Total:   ${rawData.length}`)
  console.log(`Dev:     ${devSet.length} (${((devSet.length / rawData.length) * 100).toFixed(1)}%)`)
  console.log(`Heldout: ${heldoutSet.length} (${((heldoutSet.length / rawData.length) * 100).toFixed(1)}%)`)
  console.log(`Wrote:   ${devPath}`)
  console.log(`Wrote:   ${heldoutPath}`)

  return { devSet, heldoutSet }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  splitFixtures(42)
}
