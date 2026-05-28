/**
 * Live Page Scroll Synchronizer - Background Service Worker
 * Coordinates Firestore connection, URL hashing, and message broadcasts.
 */

// Native Module Imports (Assume local bundles in extension directory)
import { initializeApp } from "./firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "./firebase-firestore.js";

// Private tracking profile identification key
const USER_ID = "my_shared_private_sync_id";

// Clean Firebase integration config credentials payload placeholder
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase App and Firestore Database references
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

// Event Hub - Track tab updates and restore positions for completely loaded tabs.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url && tab.url.startsWith("http")) {
    try {
      const urlHash = getUrlHash(tab.url);
      const docPath = `users/${USER_ID}/scroll_states/${urlHash}`;
      const docRef = doc(db, docPath);
      
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (typeof data.percent === "number") {
          // Push RESTORE_SCROLL notification down into the active tab context.
          chrome.tabs.sendMessage(tabId, {
            type: "RESTORE_SCROLL",
            url: tab.url,
            percent: data.percent
          }, (response) => {
            // Silently suppress errors if matching scripts are not yet ready.
            if (chrome.runtime.lastError) {
              // Graceful failure
            }
          });
        }
      }
    } catch (error) {
      console.error("[ScrollSync] Error retrieving scroll state:", error);
    }
  }
});

// Event Hub - Listen for inbound "SAVE_SCROLL" updates from content scripts.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SAVE_SCROLL") {
    const { url, percent } = message;
    
    if (url && typeof percent === "number") {
      const urlHash = getUrlHash(url);
      const docPath = `users/${USER_ID}/scroll_states/${urlHash}`;
      const docRef = doc(db, docPath);

      // Perform a merge write to maintain Firestore integrity
      setDoc(docRef, {
        url: url,
        percent: percent,
        updatedAt: new Date().toISOString()
      }, { merge: true })
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          console.error("[ScrollSync] Error writing state to Firestore:", error);
          sendResponse({ success: false, error: error.message });
        });

      // Keep response message channel alive for asynchronous resolution.
      return true;
    }
  }
});
