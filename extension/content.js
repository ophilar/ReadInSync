/**
 * ReadInSync - Content Script
 * Monitors viewport coordinates, handles page exit triggers, and restores positions.
 */

let isInitialLoad = true;
let debounceTimeout = null;
let lastSentPercent = -1;
let isProgrammaticScroll = false;
let restorationTargetPercent = null;
let heightObserver = null;

function applyScrollRestoration(percent) {
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;

  if (scrollableHeight > 0) {
    const targetScrollY = percent * scrollableHeight;

    isProgrammaticScroll = true;
    window.scrollTo({
      top: targetScrollY,
      behavior: "auto" // Switch to instant scroll to prevent event loop spam and match UX best practice
    });

    lastSentPercent = percent;
    isInitialLoad = false;

    if (heightObserver) {
      heightObserver.disconnect();
      heightObserver = null;
    }
    return true;
  }
  return false;
}

// Restores the scroll position sent from the background service worker
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "RESTORE_SCROLL") {
    const { percent } = message;

    if (isInitialLoad && typeof percent === "number") {
      restorationTargetPercent = percent;
      const success = applyScrollRestoration(percent);

      // If page height is too small (SPA loading), observe changes to document structure
      if (!success && !heightObserver) {
        heightObserver = new MutationObserver(() => {
          if (isInitialLoad && restorationTargetPercent !== null) {
            applyScrollRestoration(restorationTargetPercent);
          }
        });
        heightObserver.observe(document.body || document.documentElement, {
          childList: true,
          subtree: true,
          attributes: true
        });
      }
    }
  }
});

// Primary function to transmit coordinate snapshot upstream
function flushScrollState() {
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  if (scrollableHeight <= 0) return;

  const currentScrollY = window.scrollY;
  const percent = Math.min(Math.max(currentScrollY / scrollableHeight, 0), 1);

  // Avoid redundant writes if coordinates haven't changed
  if (Math.abs(percent - lastSentPercent) < 0.0001) return;

  lastSentPercent = percent;

  chrome.runtime.sendMessage({
    type: "SAVE_SCROLL",
    url: window.location.href,
    title: document.title || window.location.hostname,
    percent: parseFloat(percent.toFixed(5))
  }, () => {
    if (chrome.runtime.lastError) {
      // Discard runtime closed contexts gracefully
    }
  });
}

// Debounced listener on scroll events
window.addEventListener("scroll", () => {
  if (isProgrammaticScroll) {
    isProgrammaticScroll = false; // Reset flag and ignore event
    return;
  }

  if (isInitialLoad) {
    // If the user scrolls manually during page load, terminate auto-restore gate
    isInitialLoad = false;
    if (heightObserver) {
      heightObserver.disconnect();
      heightObserver = null;
    }
    return;
  }

  if (debounceTimeout) clearTimeout(debounceTimeout);

  debounceTimeout = setTimeout(() => {
    flushScrollState();
  }, 1000); // 1-second debounce
});

// Exit/Suspension flush handlers to prevent data loss on tab closure or app context switching
window.addEventListener("beforeunload", () => {
  flushScrollState();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    flushScrollState();
  }
});

// Fallback protection: If restoration isn't established within 3 seconds, unblock manual operations
setTimeout(() => {
  isInitialLoad = false;
  if (heightObserver) {
    heightObserver.disconnect();
    heightObserver = null;
  }
}, 3000);
