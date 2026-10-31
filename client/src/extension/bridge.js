/**
 * Solli Chrome Extension Bridge
 * Connects the React Voice UI in the Side Panel to the active browser tab & embedded iframes.
 */

let activeFrameId = null
let cachedFieldsData = null

/**
 * Returns true if the app is currently running inside a Chrome Extension.
 */
export function isExtensionEnv() {
  return typeof window !== 'undefined' && Boolean(window.chrome?.runtime?.id)
}

/**
 * Store the frame ID that has the active form
 */
export function setActiveFrameId(id) {
  activeFrameId = id
}

/**
 * Send a message to the active tab's content script across frames.
 */
export async function sendToActiveTab(message) {
  if (!isExtensionEnv() || !window.chrome?.tabs) {
    return null
  }

  try {
    const [activeTab] = await window.chrome.tabs.query({ active: true, currentWindow: true })
    if (!activeTab || !activeTab.id) return null

    if (activeTab.url?.startsWith('chrome://') || activeTab.url?.startsWith('chrome-extension://')) {
      return null
    }

    // 1. If we know the active frame with the form, try it first
    if (activeFrameId !== null) {
      try {
        const res = await window.chrome.tabs.sendMessage(activeTab.id, message, { frameId: activeFrameId })
        if (res) return res
      } catch (_) {}
    }

    // 2. Try default main frame (frame 0)
    try {
      const res = await window.chrome.tabs.sendMessage(activeTab.id, message)
      if (res && (res.count > 0 || res.success)) return res
    } catch (_) {}

    // 3. Fallback: Broadcast/execute across all frames using chrome.scripting
    if (window.chrome?.scripting) {
      const results = await window.chrome.scripting.executeScript({
        target: { tabId: activeTab.id, allFrames: true },
        func: (msg) => {
          if (window.__solli_handle_message) {
            return window.__solli_handle_message(msg)
          }
          return null
        },
        args: [message],
      })

      if (Array.isArray(results)) {
        // Find whichever frame returned a successful action or found fields
        const valid = results.find(
          (r) => r.result && (r.result.count > 0 || r.result.success || r.result.fields?.length > 0)
        )
        if (valid) {
          if (valid.frameId !== undefined) {
            activeFrameId = valid.frameId
          }
          return valid.result
        }
      }
    }

    return null
  } catch (err) {
    return null
  }
}

/**
 * Scans the active browser tab (including Google Forms and iframes) and returns all detected fields.
 */
export async function scanActivePageFields() {
  const res = await sendToActiveTab({ type: 'GET_DOM_FIELDS' })
  if (!res || !res.fields || res.fields.length === 0) {
    return cachedFieldsData
  }

  const result = {
    title: res.title || 'Live Webpage Form',
    url: res.url || '',
    count: res.count || res.fields.length,
    fields: res.fields,
  }

  cachedFieldsData = result
  return result
}

/**
 * Highlight the input element on the active webpage corresponding to the current field.
 */
export async function highlightWebField(fieldId) {
  return await sendToActiveTab({ type: 'HIGHLIGHT_FIELD', fieldId })
}

/**
 * Auto-fill a verified value directly into the active webpage's matching input field.
 */
export async function autoFillWebField(fieldId, value) {
  return await sendToActiveTab({ type: 'FILL_FIELD', fieldId, value })
}

/**
 * Clicks the "Next" or "Submit" button on the active webpage form.
 */
export async function clickWebpageNextOrSubmit() {
  return await sendToActiveTab({ type: 'CLICK_NEXT_OR_SUBMIT' })
}

/**
 * Get active tab title and URL for operator context.
 */
export async function getActiveTabInfo() {
  if (!isExtensionEnv() || !window.chrome?.tabs) {
    return null
  }

  try {
    const [activeTab] = await window.chrome.tabs.query({ active: true, currentWindow: true })
    if (!activeTab) return null
    return {
      id: activeTab.id,
      title: activeTab.title || 'Active Webpage',
      url: activeTab.url || '',
    }
  } catch {
    return null
  }
}

/**
 * Subscribe to realtime DOM field detection broadcasts from content scripts
 */
export function onPageFieldsDetected(callback) {
  if (!isExtensionEnv() || !window.chrome?.runtime?.onMessage) {
    return () => {}
  }

  const handler = (message, sender) => {
    if (message.type === 'SOLLI_DOM_FIELDS_FOUND' && message.fields?.length > 0) {
      if (sender.frameId !== undefined) {
        activeFrameId = sender.frameId
      }
      const data = {
        title: message.title || 'Live Webpage Form',
        url: message.url || '',
        count: message.count || message.fields.length,
        fields: message.fields,
      }
      cachedFieldsData = data
      callback(data)
    }
  }

  window.chrome.runtime.onMessage.addListener(handler)
  return () => {
    try {
      window.chrome.runtime.onMessage.removeListener(handler)
    } catch (_) {}
  }
}
