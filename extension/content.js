/**
 * Live Page Scroll Synchronizer - Content Script
 * Tracks user scrolling natively and restores reading positions safely.
 */

// Keep track of whether the page has finished initializing.
// This prevents feedback loops where scroll adjustments cause active save operations.
let isInitialLoad = true;
let debounceTimeout = null;

// Listen for messages from the background service worker context.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "RESTORE_SCROLL") {
    const { percent } = message;

    // Only restore scroll if we are in the initial loading phase.
    if (isInitialLoad && typeof percent === "number") {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;

      if (scrollableHeight > 0) {
        const targetScrollY = percent * scrollableHeight;
        
        // Smoothly adjust the viewport scroll location.
        window.scrollTo({
          top: targetScrollY,
          behavior: "smooth"
        });
      }
      
      // Turn off initial load flag after restoring
      isInitialLoad = false;
    }
  }
});

// Capture viewport scrolling events to sync upstream.
window.addEventListener("scroll", () => {
  // If we are currently restoring or haven't settled the initial sync, hold off.
  if (isInitialLoad) {
    // If the user scrolls manually before restore, we clear the initial load flag.
    isInitialLoad = false;
    return;
  }

  // Active scroll debounce to limit database write frequencies.
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }

  debounceTimeout = setTimeout(() => {
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    
    // Avoid calculations if the page isn't scrollable.
    if (scrollableHeight <= 0) {
      return;
    }

    const currentScrollY = window.scrollY;
    const percent = Math.min(Math.max(currentScrollY / scrollableHeight, 0), 1);

    // Communicate scroll position update to the background service worker thread.
    chrome.runtime.sendMessage({
      type: "SAVE_SCROLL",
      url: window.location.href,
      percent: parseFloat(percent.toFixed(5))
    }, (response) => {
      // Gracefully handle runtime disconnected conditions (e.g., extension reloaded in development).
      if (chrome.runtime.lastError) {
        // Discard gracefully.
      }
    });
  }, 1000); // 1-second debounce
});

// Fallback safety gate: If no RESTORE_SCROLL is received within 3 seconds,
// release the listener to make sure manual scrolls capture correctly.
setTimeout(() => {
  isInitialLoad = false;
}, 3000);
