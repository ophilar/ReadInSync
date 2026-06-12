/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const manifestCode = `{
  "manifest_version": 3,
  "name": "ReadInSync - Scroll Synchronizer",
  "version": "1.1.0",
  "description": "Natively and securely synchronizes reading positions on live web pages across devices using mandatory E2EE.",
  "permissions": [
    "storage",
    "tabs"
  ],
  "host_permissions": [
    "https://*/*",
    "http://*/*"
  ],
  "action": {
    "default_title": "ReadInSync Config",
    "default_popup": "popup.html"
  },
  "background": {
    "service_worker": "background.js",
    "scripts": [
      "background.js"
    ],
    "type": "module"
  },
  "browser_specific_settings": {
    "gecko": {
      "id": "readinsync@gemini.google.com",
      "strict_min_version": "109.0",
      "data_collection_permissions": {
        "required": [
          "none"
        ]
      }
    },
    "gecko_android": {
      "strict_min_version": "109.0"
    }
  },
  "content_scripts": [
    {
      "matches": [
        "https://*/*",
        "http://*/*"
      ],
      "js": [
        "content.js"
      ],
      "run_at": "document_idle"
    }
  ]
}`;

export const contentCode = `/**
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
}, 3000);`;

export const cryptoCode = `/**
 * ReadInSync - Cryptographic Utilities
 * Implements native PBKDF2 key derivation and AES-GCM encryption/decryption for Service Workers.
 */

/**
 * Derives a deterministic 256-bit AES-GCM key from a password and a Sync ID (salt).
 * @param {string} password The Master Sync Password.
 * @param {string} saltString The Sync ID to use as salt.
 * @returns {Promise<CryptoKey>} The derived encryption key.
 */
export async function deriveSyncKey(password, saltString) {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = encoder.encode(saltString);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false, // Don't make the key extractable for security
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a data object using the derived key.
 * @param {Object} dataObj The data to encrypt (e.g. { url, title, percent }).
 * @param {CryptoKey} derivedKey 
 * @returns {Promise<{iv: string, ciphertext: string}>}
 */
export async function encryptPayload(dataObj, derivedKey) {
  const jsonString = JSON.stringify(dataObj);
  const encoded = new TextEncoder().encode(jsonString);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    derivedKey,
    encoded
  );

  return {
    iv: arrayBufferToBase64(iv),
    ciphertext: arrayBufferToBase64(encryptedBuffer)
  };
}

/**
 * Decrypts a payload using the derived key.
 * @param {string} ciphertextBase64 
 * @param {string} ivBase64 
 * @param {CryptoKey} derivedKey 
 * @returns {Promise<Object>} The decrypted data object.
 */
export async function decryptPayload(ciphertextBase64, ivBase64, derivedKey) {
  const iv = base64ToArrayBuffer(ivBase64);
  const ciphertext = base64ToArrayBuffer(ciphertextBase64);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    derivedKey,
    ciphertext
  );

  const decodedString = new TextDecoder().decode(decryptedBuffer);
  return JSON.parse(decodedString);
}

// Utility: Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Utility: Convert Base64 to ArrayBuffer (Uint8Array)
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}`;

export const backgroundCode = `/**
 * ReadInSync - Background Service Worker (ES Module)
 * Implements mandatory E2EE coordination, secure Firestore communication, and coordinate routing.
 */

// Native Module Imports (Assume local bundles in extension directory)
import { initializeApp } from "./firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "./firebase-firestore.js";
import { deriveSyncKey, encryptPayload, decryptPayload } from "./crypto.js";

// Storage keys corresponding to configuration
const STORAGE_KEYS = {
  SYNC_ID: "readinsync_sync_id",
  SYNC_PASSWORD: "readinsync_sync_password"
};

// Clean Firebase integration config credentials payload placeholder
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_FIREBASE_AUTH_DOMAIN",
  projectId: "YOUR_FIREBASE_PROJECT_ID",
  storageBucket: "YOUR_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "YOUR_FIREBASE_MESSAGING_SENDER_ID",
  appId: "YOUR_FIREBASE_APP_ID"
};

// Initialize Firebase App and Firestore Database references
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// In-memory caching of the active cryptographic key and Sync ID
let derivedCryptoKey = null;
let currentSyncId = null;

// Safe protocol allowlist
const SAFE_PROTOCOLS = ["http:", "https:"];

function isUrlSafe(url) {
  try {
    const parsed = new URL(url);
    return SAFE_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Initializes security configuration, deriving the AES key from local storage values.
 */
async function initSyncConfig() {
  try {
    let storageData;
    try {
      storageData = await chrome.storage.local.get([STORAGE_KEYS.SYNC_ID, STORAGE_KEYS.SYNC_PASSWORD]);
    } catch {
      storageData = await new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.SYNC_ID, STORAGE_KEYS.SYNC_PASSWORD], resolve);
      });
    }

    const syncId = storageData[STORAGE_KEYS.SYNC_ID];
    const syncPassword = storageData[STORAGE_KEYS.SYNC_PASSWORD];

    if (!syncId || !syncPassword) {
      console.warn("[ReadInSync] Missing configuration. Deferring E2EE initialization until configured via popup.");
      derivedCryptoKey = null;
      currentSyncId = null;
      return;
    }

    currentSyncId = syncId;
    derivedCryptoKey = await deriveSyncKey(syncPassword, syncId);
    console.log("[ReadInSync] Cryptographic key successfully derived. Secure sync active.");
  } catch (error) {
    console.error("[ReadInSync] Error initializing encryption configuration:", error);
    derivedCryptoKey = null;
    currentSyncId = null;
  }
}

// Initialize and store the configuration promise globally
let initPromise = initSyncConfig();

/**
 * Deterministically hashes a URL to a Firestore-safe document ID.
 * Returns a clean alphanumeric ID (e.g., 'url_ab38cd1').
 */
function getUrlHash(url) {
  let hash = 5381;
  const cleanUrl = url.split('#')[0]; // Strip hash fragments
  for (let i = 0; i < cleanUrl.length; i++) {
    hash = (hash * 33) ^ cleanUrl.charCodeAt(i);
  }
  return \`url_\${(hash >>> 0).toString(16)}\`;
}

// Listen for updates from the options/popup configurations or tab controllers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CONFIG_UPDATED") {
    console.log("[ReadInSync] Received CONFIG_UPDATED signal. Recalculating E2EE parameters.");
    initPromise = initSyncConfig();
    initPromise.then(() => {
      sendResponse({ success: true });
    });
    return true; // Keep message port active for async reply
  }

  if (message.type === "SAVE_SCROLL") {
    const { url, title, percent } = message;

    initPromise.then(() => {
      if (!isUrlSafe(url)) {
        console.warn("[ReadInSync] Denied save for unsafe or non-http/s URL:", url);
        sendResponse({ success: false, error: "Unsafe URL" });
        return;
      }

      if (!derivedCryptoKey || !currentSyncId) {
        console.error("[ReadInSync] Blocked save. Mandatory E2EE is not configured.");
        sendResponse({ success: false, error: "E2EE not initialized" });
        return;
      }

      const docId = getUrlHash(url);
      const docPath = \`users/\${currentSyncId}/scroll_states/\${docId}\`;
      const docRef = doc(db, docPath);

      // Formulate structured state and encrypt everything into a single ciphertext string
      const statePayload = { url, title, percent };
      
      encryptPayload(statePayload, derivedCryptoKey)
        .then(({ iv, ciphertext }) => {
          // Only write encrypted package and public sorting timestamp
          return setDoc(docRef, {
            ciphertext: ciphertext,
            iv: iv,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        })
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          console.error("[ReadInSync] Error during payload encryption or setDoc execution:", error);
          sendResponse({ success: false, error: error.message });
        });
    });

    return true; // Keep message port active for async reply
  }
});

// Capture page loaded events and restore matched scroll states
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url && tab.url.startsWith("http")) {
    if (!isUrlSafe(tab.url)) return;

    await initPromise; // Wait for initial config load!

    if (!derivedCryptoKey || !currentSyncId) {
      console.warn("[ReadInSync] Tab update skipped. E2EE configuration not established.");
      return;
    }

    try {
      const docId = getUrlHash(tab.url);
      const docPath = \`users/\${currentSyncId}/scroll_states/\${docId}\`;
      const docRef = doc(db, docPath);

      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const docData = docSnap.data();
        
        if (docData.ciphertext && docData.iv) {
          // Decrypt the consolidated payload locally
          const decryptedState = await decryptPayload(docData.ciphertext, docData.iv, derivedCryptoKey);
          
          if (typeof decryptedState.percent === "number") {
            chrome.tabs.sendMessage(tabId, {
              type: "RESTORE_SCROLL",
              url: tab.url,
              percent: decryptedState.percent
            }, () => {
              if (chrome.runtime.lastError) {
                // Ignore gracefully if matching listener script is inactive
              }
            });
          }
        }
      }
    } catch (error) {
      console.error("[ReadInSync] Failed to fetch or decrypt document state:", error);
    }
  }
});`;
