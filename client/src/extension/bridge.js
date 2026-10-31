/**
 * Solli Chrome Extension Bridge
 * Connects the React Voice UI in the Side Panel to the active browser tab.
 */

/**
 * Returns true if the app is currently running inside a Chrome Extension.
 */
export function isExtensionEnv() {
  return typeof window !== 'undefined' && Boolean(window.chrome?.runtime?.id)
}

/**
 * Send a message to the active tab's content script.
 */
export async function sendToActiveTab(message) {
  if (!isExtensionEnv() || !window.chrome?.tabs) {
    return null
  }

  try {
    const [activeTab] = await window.chrome.tabs.query({ active: true, currentWindow: true })
    if (!activeTab || !activeTab.id) return null

    // Do not attempt to inject into chrome:// or extension internal pages
    if (activeTab.url?.startsWith('chrome://') || activeTab.url?.startsWith('chrome-extension://')) {
      return null
    }

    return await window.chrome.tabs.sendMessage(activeTab.id, message)
  } catch (err) {
    // Content script might not be injected or page doesn't allow scripting
    return null
  }
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

