import collegeAdmissionJson from './college_admission.json' with { type: 'json' }
import pensionJson from './pension.json' with { type: 'json' }

export const BUILTIN_SCHEMAS = {
  pension: pensionJson,
  college_admission: collegeAdmissionJson,
}

let activeCustomSchema = null

export function setActiveCustomSchema(schema) {
  activeCustomSchema = schema
}

export function getActiveCustomSchema() {
  return activeCustomSchema
}

/**
 * Automatically converts DOM fields detected on any webpage (including Google Forms)
 * into a fully-functional Solli Form Schema.
 */
export function generateWebFormSchema(detectedFields = [], pageTitle = 'Webpage Form') {
  if (!detectedFields || detectedFields.length === 0) {
    return null
  }

  const fields = detectedFields.map((f, i) => {
    const rawLabel = f.label || f.name || `Question ${i + 1}`
    const cleanLabel = rawLabel.replace(/[\n\r]+/g, ' ').replace(/\s*\*$/, '').trim()
    const isRequired = Boolean(f.required || rawLabel.includes('*'))

    // Generate intelligent contextual questions
    let questionTa = `${cleanLabel} என்ன?`
    let questionEn = `What is your ${cleanLabel}?`

    const lower = cleanLabel.toLowerCase()
    if (lower.includes('name') || lower.includes('பெயர்')) {
      questionTa = 'உங்கள் முழு பெயர் என்ன?'
      questionEn = 'What is your full name?'
    } else if (lower.includes('email') || lower.includes('மின்னஞ்சல்') || f.type === 'email') {
      questionTa = 'உங்கள் மின்னஞ்சல் முகவரி என்ன?'
      questionEn = 'What is your email address?'
    } else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('contact') || lower.includes('அலைபேசி')) {
      questionTa = 'உங்கள் பத்து இலக்க அலைபேசி எண் என்ன?'
      questionEn = 'What is your mobile number?'
    } else if (lower.includes('aadhaar') || lower.includes('aadhar') || lower.includes('ஆதார்')) {
      questionTa = 'உங்கள் ஆதார் எண் என்ன?'
      questionEn = 'What is your Aadhaar number?'
    } else if (lower.includes('address') || lower.includes('முகவரி')) {
      questionTa = 'உங்கள் முகவரி என்ன?'
      questionEn = 'What is your address?'
    } else if (lower.includes('period') || lower.includes('class') || lower.includes('course') || lower.includes('degree')) {
      questionTa = `உங்கள் ${cleanLabel} எது?`
      questionEn = `Which ${cleanLabel}?`
    }

    return {
      id: f.id || `web_field_${i}`,
      order: i + 1,
      type: f.type === 'email' ? 'text' : f.type || 'text',
      required: isRequired,
      spoken: true,
      selector: f.selector,
      labels: {
        en: cleanLabel,
        ta: cleanLabel,
      },
      question: {
        ta: questionTa,
        taRoman: questionTa,
        en: questionEn,
      },
      helpPrompt: {
        ta: `${cleanLabel} விவரத்தை தெளிவாக சொல்லுங்கள்.`,
        taRoman: `${cleanLabel} vivarathai thelivaaga sollungal.`,
        en: `Please state your ${cleanLabel} clearly.`,
      },
      readback: {
        ta: `${cleanLabel} {value}. சரியா?`,
        en: `${cleanLabel} is {value}. Is this correct?`,
      },
      validation: {
        rule: lower.includes('phone') ? 'phone' : lower.includes('aadhaar') ? 'aadhaar' : 'text',
        min: 1,
        max: 120,
      },
      confirm: 'always',
      sensitive: lower.includes('aadhaar') || lower.includes('phone') || lower.includes('account'),
    }
  })

  return {
    id: 'live_web_form',
    title: pageTitle,
    titleTa: `${pageTitle} (நேரடி படிவம்)`,
    language: 'ta-IN',
    version: '1.0.0',
    source: 'Active Browser Tab',
    disclaimer: 'Live Webpage Auto-Fill Form',
    fields,
  }
}
