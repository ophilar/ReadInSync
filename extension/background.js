/**
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
  return `url_${(hash >>> 0).toString(16)}`;
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
      const docPath = `users/${currentSyncId}/scroll_states/${docId}`;
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
      const docPath = `users/${currentSyncId}/scroll_states/${docId}`;
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
});
