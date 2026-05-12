/**
 * content.js — Extension content script.
 *
 * Injected into all pages (matches: <all_urls>).
 * Extracts the current page URL for analysis when requested.
 */

// Listen for messages from the popup or background worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_PAGE_URL') {
        sendResponse({ url: window.location.href });
    }
});
