import { initializeApp } from "firebase/app";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";

const STORAGE_KEYS = {
  SYNC_ID: "readinsync_sync_id",
  SYNC_PASSWORD: "readinsync_sync_password"
};

// Generates a cryptographically secure random alphanumeric string
function generateSecureId(length = 16) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  let id = "";
  for (let i = 0; i < length; i++) {
    id += chars[array[i] % chars.length];
  }
  return id;
}

document.addEventListener("DOMContentLoaded", async () => {
  const syncIdInput = document.getElementById("syncId");
  const syncPasswordInput = document.getElementById("syncPassword");
  const btnSave = document.getElementById("btnSave");
  const btnCopy = document.getElementById("btnCopy");
  const btnRegen = document.getElementById("btnRegen");
  const errorMsg = document.getElementById("errorMsg");
  const statusBadge = document.getElementById("statusBadge");

  const authStatusText = document.getElementById("authStatusText");
  const authUserEmail = document.getElementById("authUserEmail");
  const btnAuthAction = document.getElementById("btnAuthAction");

  let auth = null;
  let customSyncId = "";
  let currentUid = null;

  // 1. Fetch Firebase config and initialize Auth
  try {
    const configRes = await fetch(chrome.runtime.getURL("firebase-config.json"));
    const firebaseConfig = await configRes.json();
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  } catch (err) {
    authStatusText.textContent = "Configuration Error";
    authUserEmail.textContent = "Verify firebase-config.json";
    authUserEmail.style.display = "block";
    btnAuthAction.style.display = "none";
    console.error("Firebase config load error:", err);
  }

  // 2. Load custom profile config from storage
  let data = await chrome.storage.local.get([STORAGE_KEYS.SYNC_ID, STORAGE_KEYS.SYNC_PASSWORD]);
  customSyncId = data[STORAGE_KEYS.SYNC_ID];
  const storedPassword = data[STORAGE_KEYS.SYNC_PASSWORD];

  if (!customSyncId) {
    customSyncId = generateSecureId(16);
    await chrome.storage.local.set({ [STORAGE_KEYS.SYNC_ID]: customSyncId });
  }

  syncIdInput.value = customSyncId;
  if (storedPassword) {
    syncPasswordInput.value = storedPassword;
    statusBadge.style.display = "flex";
  } else {
    statusBadge.style.display = "none";
  }

  // 3. Monitor Auth State changes
  if (auth) {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        currentUid = user.uid;
        if (user.isAnonymous) {
          authStatusText.textContent = "Authenticated (Anonymous)";
          authUserEmail.style.display = "none";
          syncIdInput.value = customSyncId;
          btnRegen.disabled = false;
        } else {
          authStatusText.textContent = "Signed In";
          authUserEmail.textContent = user.email || `UID: ${user.uid.substring(0, 10)}...`;
          authUserEmail.style.display = "block";
          
          // Force Sync ID to use the user's Auth UID for seamless cross-device matching
          syncIdInput.value = user.uid;
          btnRegen.disabled = true;
        }
        btnAuthAction.textContent = "Sign Out";
        btnAuthAction.className = "btn btn-secondary btn-full";
      } else {
        currentUid = null;
        authStatusText.textContent = "Not Authenticated";
        authUserEmail.style.display = "none";
        syncIdInput.value = customSyncId;
        btnRegen.disabled = false;
        btnAuthAction.textContent = "Sign In to Sync";
        btnAuthAction.className = "btn btn-full";
      }
    });
  }

  // Auth Button handler
  btnAuthAction.addEventListener("click", async () => {
    if (!auth) return;
    if (auth.currentUser) {
      // Sign Out
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Sign out failed:", err);
      }
    } else {
      // Open auth.html in a new tab
      chrome.tabs.create({ url: chrome.runtime.getURL("auth.html") });
    }
  });

  // Save Sync Config
  btnSave.addEventListener("click", async () => {
    const enteredPassword = syncPasswordInput.value.trim();
    errorMsg.style.display = "none";

    if (!enteredPassword) {
      errorMsg.textContent = "Error: E2EE Sync Password is mandatory. Please provide a password.";
      errorMsg.style.display = "block";
      return;
    }

    const targetSyncId = (auth && auth.currentUser && !auth.currentUser.isAnonymous) 
      ? auth.currentUser.uid 
      : syncIdInput.value.trim();

    if (targetSyncId.length < 8) {
      errorMsg.textContent = "Error: Sync Profile ID must be at least 8 characters.";
      errorMsg.style.display = "block";
      return;
    }

    if (!auth || !auth.currentUser) {
      errorMsg.textContent = "Error: You must authenticate (anonymous or account sign-in) to sync.";
      errorMsg.style.display = "block";
      return;
    }

    // Update storage
    const storageUpdate = {
      [STORAGE_KEYS.SYNC_PASSWORD]: enteredPassword
    };
    if (!auth.currentUser || auth.currentUser.isAnonymous) {
      customSyncId = targetSyncId;
      storageUpdate[STORAGE_KEYS.SYNC_ID] = targetSyncId;
    }
    await chrome.storage.local.set(storageUpdate);

    // Notify service worker of key updates immediately
    chrome.runtime.sendMessage({
      type: "CONFIG_UPDATED",
      syncId: targetSyncId,
      syncPassword: enteredPassword
    }, () => {
      if (chrome.runtime.lastError) {
        // Discard error gracefully if background worker is asleep
      }
    });

    statusBadge.style.display = "flex";
    btnSave.textContent = "Config Saved!";
    btnSave.style.background = "#10b981";

    setTimeout(() => {
      btnSave.textContent = "Save Sync Config";
      btnSave.style.background = "";
    }, 1500);
  });

  // Copy Profile ID
  btnCopy.addEventListener("click", () => {
    navigator.clipboard.writeText(syncIdInput.value);
    btnCopy.textContent = "Copied!";
    setTimeout(() => {
      btnCopy.textContent = "Copy";
    }, 1200);
  });

  // Regenerate Sync ID
  btnRegen.addEventListener("click", async () => {
    if (confirm("Are you sure you want to regenerate your Sync ID? Devices using the old ID will lose synchronization.")) {
      const newId = generateSecureId(16);
      customSyncId = newId;
      syncIdInput.value = newId;
      await chrome.storage.local.set({ [STORAGE_KEYS.SYNC_ID]: newId });
      statusBadge.style.display = "none";
    }
  });
});
