/**
 * Solli Background Service Worker (Manifest V3)
 * Automatically opens the Solli Side Panel when the toolbar icon is tapped.
 */

// Enable the side panel to open on action click for all tabs
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
      console.warn('Could not set side panel behavior:', err)
    })
  }
})

// Fallback action click handler
chrome.action.onClicked.addListener(async (tab) => {
  if (chrome.sidePanel && chrome.sidePanel.open) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id })
    } catch (err) {
      console.warn('Error opening side panel:', err)
    }
  }
})

