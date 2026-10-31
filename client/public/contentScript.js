/**
 * Solli Injected Content Script (Chrome Extension)
 * Runs on the active webpage to discover form fields, highlight active inputs,
 * and auto-fill confirmed values directly into the target web form.
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
    address_line: [/address/i, /street/i, /முகவரி/i, /door/i, /house/i],
    village: [/village/i, /town/i, /city/i, /கிராமம்/i, /ஊர்/i],
    taluk: [/taluk/i, /tehsil/i, /வட்டம்/i],
    district: [/district/i, /மாவட்டம்/i],
    pincode: [/pin/i, /pincode/i, /postal/i, /அஞ்சல்/i, /zip/i],
    bank_account: [/account/i, /bank/i, /கணக்கு/i, /acc[_\s-]?no/i],
    ifsc: [/ifsc/i, /branch/i],
  }

  /**
   * Find an input, select, or textarea element on the active page matching a field pattern.
   */
  function findElementForField(fieldId) {
    const patterns = FIELD_PATTERNS[fieldId] || [new RegExp(fieldId.replace(/_/g, '.*'), 'i')]
    const candidates = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea'))

    for (const el of candidates) {
      const name = el.getAttribute('name') || ''
      const id = el.getAttribute('id') || ''
      const placeholder = el.getAttribute('placeholder') || ''
      const ariaLabel = el.getAttribute('aria-label') || ''
      const labelEl = el.id ? document.querySelector(`label[for="${el.id}"]`) : el.closest('label')
      const labelText = labelEl ? labelEl.innerText : ''

      const combinedMeta = `${name} ${id} ${placeholder} ${ariaLabel} ${labelText}`.toLowerCase()

      for (const pattern of patterns) {
        if (pattern.test(combinedMeta)) {
          return el
        }
      }
    }

    return null
  }

  /**
   * Inject value with proper event bubbling for React, Angular, Vue, and vanilla DOM forms.
   */
  function fillElement(element, value) {
    if (!element) return false

    element.focus()

    // Handle React input setter override
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set

    if (element instanceof HTMLInputElement && nativeInputValueSetter) {
      nativeInputValueSetter.call(element, value)
    } else {
      element.value = value
    }

    // Dispatch input & change events for form validation frameworks
    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))
    element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }))

    // Visual feedback: Flash green confirmation highlight
    const originalOutline = element.style.outline
    const originalBoxShadow = element.style.boxShadow
    const originalTransition = element.style.transition

    element.style.transition = 'box-shadow 0.25s ease, outline 0.25s ease'
    element.style.outline = '2px solid #10b981'
    element.style.boxShadow = '0 0 12px rgba(16, 185, 129, 0.45)'

    setTimeout(() => {
      element.style.outline = originalOutline
      element.style.boxShadow = originalBoxShadow
      element.style.transition = originalTransition
    }, 1800)

    return true
  }

  /**
   * Highlight current field being asked
   */
  function highlightField(fieldId) {
    const el = findElementForField(fieldId)
    if (!el) return

    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.style.outline = '2px solid #ff5e62'
    el.style.boxShadow = '0 0 10px rgba(255, 94, 98, 0.4)'

    setTimeout(() => {
      if (el.style.outline === '2px solid rgb(255, 94, 98)') {
        el.style.outline = ''
        el.style.boxShadow = ''
      }
    }, 4000)
  }

  // Listen for messages from Solli Side Panel
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'PING') {
      sendResponse({ status: 'PONG', url: window.location.href, title: document.title })
      return true
    }

    if (request.type === 'HIGHLIGHT_FIELD') {
      highlightField(request.fieldId)
      sendResponse({ success: true })
      return true
    }

    if (request.type === 'FILL_FIELD') {
      const el = findElementForField(request.fieldId)
      const filled = fillElement(el, request.value)
      sendResponse({ success: filled, fieldId: request.fieldId })
      return true
    }

    if (request.type === 'GET_DOM_FIELDS') {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea'))
      const fields = inputs.map((el, i) => {
        const labelEl = el.id ? document.querySelector(`label[for="${el.id}"]`) : el.closest('label')
        return {
          index: i,
          name: el.name || el.id || `field_${i}`,
          label: labelEl ? labelEl.innerText.trim() : el.placeholder || el.name || '',
          type: el.type || el.tagName.toLowerCase(),
          value: el.value || '',
        }
      })
      sendResponse({ count: fields.length, fields: fields.slice(0, 30) })
      return true
    }
  })
})()

