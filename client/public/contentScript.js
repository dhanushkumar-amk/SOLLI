/**
 * Solli Injected Content Script (Chrome Extension)
 * Deep scanner for Google Forms and arbitrary web forms.
 * Auto-detects questions, highlights active inputs, auto-fills answers, and advances forms.
 */

(() => {
  // Common Tamil and English field keywords for fuzzy DOM matching
  const FIELD_PATTERNS = {
    applicant_name: [/name/i, /பெயர்/i, /applicant/i, /student/i, /candidate/i, /full[_\s-]?name/i],
    parent_spouse_name: [/father/i, /husband/i, /parent/i, /தந்தை/i, /கணவர்/i, /guardian/i],
    gender: [/gender/i, /sex/i, /பாலினம்/i],
    dob: [/dob/i, /birth/i, /பிறந்த/i, /date[_\s-]?of[_\s-]?birth/i],
    age: [/age/i, /வயது/i],
    aadhaar: [/aadhaar/i, /aadhar/i, /uid/i, /ஆதார்/i],
    phone: [/phone/i, /mobile/i, /contact/i, /cell/i, /அலைபேசி/i, /தொலைபேசி/i],
    email: [/email/i, /mail/i, /மின்னஞ்சல்/i],
    address_line: [/address/i, /street/i, /முகவரி/i, /door/i, /house/i],
    village: [/village/i, /town/i, /city/i, /கிராமம்/i, /ஊர்/i],
    taluk: [/taluk/i, /tehsil/i, /வட்டம்/i],
    district: [/district/i, /மாவட்டம்/i],
    pincode: [/pin/i, /pincode/i, /postal/i, /அஞ்சல்/i, /zip/i],
    bank_account: [/account/i, /bank/i, /கணக்கு/i, /acc[_\s-]?no/i],
    ifsc: [/ifsc/i, /branch/i],
  }

  // Registry of detected question fields on this page
  let detectedQuestions = []

  /**
   * Deep scan for Google Forms and standard web forms on the page
   */
  function scanPageFormFields() {
    const results = []

    // 1. Google Forms Specific Parser (Container-based)
    const googleFormItems = Array.from(
      document.querySelectorAll(
        'div[role="listitem"], div.Qr7Oae, div.freebirdFormviewerViewItemsItemItem'
      )
    )

    if (googleFormItems.length > 0) {
      googleFormItems.forEach((item, index) => {
        // Find question title
        const headingEl = item.querySelector(
          'div[role="heading"], span.M7eMe, div.freebirdFormviewerViewItemsItemItemTitle, [aria-level]'
        )
        const helpEl = item.querySelector(
          'div.g9q0rc, div.freebirdFormviewerViewItemsItemItemHelpText'
        )

        const titleText = headingEl ? headingEl.innerText.trim() : ''
        if (!titleText) return

        // Find associated input
        const inputEl = item.querySelector(
          'input[type="text"], input[type="email"], input[type="date"], input[type="number"], textarea, div[role="listbox"], div[role="radio"], div[role="checkbox"]'
        )
        if (!inputEl) return

        const isRequired = Boolean(
          item.querySelector('span.v3Yvs, [aria-required="true"]') || titleText.includes('*')
        )

        const fieldId = `gform_q_${index}`
        inputEl.setAttribute('data-solli-id', fieldId)

        results.push({
          id: fieldId,
          order: index + 1,
          label: titleText,
          hint: helpEl ? helpEl.innerText.trim() : '',
          type: inputEl.type === 'email' ? 'email' : inputEl.tagName.toLowerCase() === 'textarea' ? 'text' : inputEl.type || 'text',
          required: isRequired,
          selector: `[data-solli-id="${fieldId}"]`,
        })
      })
    }

    // 2. Standard HTML Web Forms Fallback (If not Google Forms or additional inputs exist)
    if (results.length === 0) {
      const candidates = Array.from(
        document.querySelectorAll(
          'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea'
        )
      )

      candidates.forEach((el, index) => {
        // Skip invisible elements
        if (el.offsetParent === null && !el.getClientRects().length) return

        const labelEl = el.id ? document.querySelector(`label[for="${el.id}"]`) : el.closest('label')
        const ariaLabel = el.getAttribute('aria-label') || ''
        const placeholder = el.getAttribute('placeholder') || ''
        const name = el.getAttribute('name') || ''

        let labelText = labelEl ? labelEl.innerText.trim() : ariaLabel || placeholder || name || `Field ${index + 1}`

        const fieldId = `web_field_${index}`
        el.setAttribute('data-solli-id', fieldId)

        results.push({
          id: fieldId,
          order: index + 1,
          label: labelText,
          hint: placeholder,
          type: el.type || el.tagName.toLowerCase(),
          required: Boolean(el.required || el.getAttribute('aria-required') === 'true' || labelText.includes('*')),
          selector: `[data-solli-id="${fieldId}"]`,
        })
      })
    }

    detectedQuestions = results
    return results
  }

  /**
   * Find target DOM element by fieldId or selector
   */
  function findElement(fieldId) {
    if (!fieldId) return null

    // 1. Check data-solli-id
    let el = document.querySelector(`[data-solli-id="${fieldId}"]`)
    if (el) return el

    // 2. Check direct ID or Name
    el = document.getElementById(fieldId) || document.querySelector(`[name="${fieldId}"]`)
    if (el) return el

    // 3. Check fuzzy patterns
    for (const [key, patterns] of Object.entries(FIELD_PATTERNS)) {
      if (key === fieldId || patterns.some((p) => p.test(fieldId))) {
        const candidates = Array.from(
          document.querySelectorAll('input:not([type="hidden"]), select, textarea')
        )
        for (const candidate of candidates) {
          const meta = `${candidate.name} ${candidate.id} ${candidate.placeholder} ${candidate.getAttribute('aria-label') || ''}`.toLowerCase()
          if (patterns.some((p) => p.test(meta))) {
            return candidate
          }
        }
      }
    }

    return null
  }

  /**
   * Inject value with React, Angular, Google Forms, and Vanilla DOM event bubbling
   */
  function fillElement(element, value) {
    if (!element) return false

    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    element.focus()

    // Handle React & Google Forms native property setters
    const isTextArea = element instanceof HTMLTextAreaElement
    const proto = isTextArea ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set

    if (nativeSetter) {
      nativeSetter.call(element, value)
    } else {
      element.value = value
    }

    // Google Forms specific attribute bindings
    element.setAttribute('data-initial-value', value)
    element.setAttribute('badinput', 'false')

    // Dispatch full sequence of synthetic events
    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))
    element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }))
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }))
    element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' }))
    element.dispatchEvent(new Event('blur', { bubbles: true }))

    // Visual feedback: Flash green confirmation ring
    const originalOutline = element.style.outline
    const originalBoxShadow = element.style.boxShadow
    const originalTransition = element.style.transition

    element.style.transition = 'box-shadow 0.25s ease, outline 0.25s ease'
    element.style.outline = '3px solid #10b981'
    element.style.boxShadow = '0 0 16px rgba(16, 185, 129, 0.55)'

    setTimeout(() => {
      element.style.outline = originalOutline
      element.style.boxShadow = originalBoxShadow
      element.style.transition = originalTransition
    }, 2000)

    return true
  }

  /**
   * Highlight current field being asked with a warm Sunset Coral ring
   */
  function highlightField(fieldId) {
    const el = findElement(fieldId)
    if (!el) return

    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.style.transition = 'box-shadow 0.25s ease, outline 0.25s ease'
    el.style.outline = '3px solid #ff5e62'
    el.style.boxShadow = '0 0 14px rgba(255, 94, 98, 0.5)'

    setTimeout(() => {
      if (el.style.outline === '3px solid rgb(255, 94, 98)') {
        el.style.outline = ''
        el.style.boxShadow = ''
      }
    }, 5000)
  }

  /**
   * Automatically clicks "Next" or "Submit" on Google Forms or standard forms
   */
  function clickNextOrSubmit() {
    const candidates = Array.from(
      document.querySelectorAll(
        'button, input[type="submit"], div[role="button"], span'
      )
    )

    for (const el of candidates) {
      const text = (el.innerText || el.value || el.getAttribute('aria-label') || '').toLowerCase().trim()
      if (text === 'next' || text === 'submit' || text === 'continue' || text === 'அடுத்து' || text === 'சமர்ப்பி') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.click()
        return true
      }
    }
    return false
  }

  // Chrome Extension Message Listener
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'PING') {
      sendResponse({ status: 'PONG', url: window.location.href, title: document.title })
      return true
    }

    if (request.type === 'GET_DOM_FIELDS') {
      const fields = scanPageFormFields()
      sendResponse({
        url: window.location.href,
        title: document.title || 'Live Web Form',
        count: fields.length,
        fields,
      })
      return true
    }

    if (request.type === 'HIGHLIGHT_FIELD') {
      highlightField(request.fieldId)
      sendResponse({ success: true })
      return true
    }

    if (request.type === 'FILL_FIELD') {
      const el = findElement(request.fieldId)
      const success = fillElement(el, request.value)
      sendResponse({ success, fieldId: request.fieldId })
      return true
    }

    if (request.type === 'CLICK_NEXT_OR_SUBMIT') {
      const clicked = clickNextOrSubmit()
      sendResponse({ success: clicked })
      return true
    }
  })

  // Initial scan
  scanPageFormFields()
})()
