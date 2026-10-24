// Lexicon configuration for Tamil-English code-mixed speech normalisation
// Note: This is a curated baseline vocabulary designed for rural pension applications.

export const FILLERS = [
  'um',
  'uh',
  'so',
  'ennada',
  'appo',
  'sir',
  'madam',
  'enga',
  'vandhu',
  'paatha',
  'noise',
  'er',
  'ah',
]

export const CORRECTION_MARKERS = [
  'illai',
  'illa',
  'illanga',
  'no no',
  'no',
  'sorry',
  'wait',
  'i mean',
  'thappu',
  'மாத்தி',
  'இல்லை',
]

// Common Tamil script <-> Roman script variants lookup table
export const SCRIPT_VARIANTS = {
  // Affirmative / Yes
  ஆமா: 'yes',
  ஆமாம்: 'yes',
  ஆம்: 'yes',
  aama: 'yes',
  aamam: 'yes',
  aam: 'yes',
  sari: 'yes',
  சரி: 'yes',
  correct: 'yes',
  ok: 'yes',

  // Negative / No
  இல்லை: 'no',
  இல்ல: 'no',
  illai: 'no',
  illa: 'no',
  ille: 'no',
  kidaiyathu: 'no',
  கிடையாது: 'no',

  // Gender choices
  ஆண்: 'Male',
  aan: 'Male',
  male: 'Male',
  man: 'Male',
  பெண்: 'Female',
  pen: 'Female',
  female: 'Female',
  woman: 'Female',
  மற்றவை: 'Other',
  matravai: 'Other',
  other: 'Other',
}

// Prefixes commonly spoken in rural speech before giving a field answer
export const SPOKEN_PREFIXES = {
  name: [
    /^(?:en\s+peru|en\s+peyar|my\s+name\s+is|name\s+is|naan|nan)\s+/i,
    /^(?:என்\s+பெயர்|என்\s+பேரு|நான்)\s+/u,
  ],
  parent_spouse: [
    /^(?:appa\s+peru|kanavar\s+peru|veetukaarar\s+peru|husband\s+name|father\s+name)\s+/i,
    /^(?:அப்பா\s+பெயர்|கணவர்\s+பெயர்|கணவன்\s+பெயர்)\s+/u,
  ],
  nominee: [
    /^(?:en\s+nominee|nominee\s+peru|nominee\s+name|nominee\s+is)\s+/i,
    /^(?:என்\s+வாரிசு|வாரிசு\s+பெயர்)\s+/u,
  ],
  village: [
    /^(?:en\s+ooru|ooru\s+peru|en\s+village|village\s+is)\s+/i,
    /^(?:என்\s+ஊர்|ஊர்\s+பெயர்|கிராமம்)\s+/u,
  ],
  taluk: [
    /^(?:en\s+taluk|my\s+taluk|taluk\s+is|taluk)\s+/i,
    /^(?:என்\s+வட்டம்|வட்டம்|தாலுகா)\s+/u,
  ],
  district: [
    /^(?:en\s+district|my\s+district|district\s+is|district)\s+/i,
    /^(?:என்\s+மாவட்டம்|மாவட்டம்)\s+/u,
  ],
  address: [
    /^(?:en\s+address|my\s+address|veetu\s+vilasam|vilasam)\s+/i,
    /^(?:முகவரி|என்\s+முகவரி)\s+/u,
  ],
}
