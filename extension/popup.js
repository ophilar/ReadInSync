/**
 * ReadInSync - Popup Controller
 * Manages configuration storage (Sync ID and Password) and communicates config changes.
 */

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

// Initial configuration loading
document.addEventListener("DOMContentLoaded", async () => {
  const syncIdInput = document.getElementById("syncId");
  const syncPasswordInput = document.getElementById("syncPassword");
  const btnSave = document.getElementById("btnSave");
  const btnCopy = document.getElementById("btnCopy");
  const btnRegen = document.getElementById("btnRegen");
  const errorMsg = document.getElementById("errorMsg");
  const statusBadge = document.getElementById("statusBadge");

  // Load from local storage
  let data;
  try {
    data = await chrome.storage.local.get([STORAGE_KEYS.SYNC_ID, STORAGE_KEYS.SYNC_PASSWORD]);
  } catch (e) {
    // browser namespace fallback for pure Firefox compatibility
    data = await new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.SYNC_ID, STORAGE_KEYS.SYNC_PASSWORD], resolve);
    });
  }

  let syncId = data[STORAGE_KEYS.SYNC_ID];
  let syncPassword = data[STORAGE_KEYS.SYNC_PASSWORD];

  // Auto-generate Sync ID on first launch
  if (!syncId) {
    syncId = generateSecureId(16);
    await chrome.storage.local.set({ [STORAGE_KEYS.SYNC_ID]: syncId });
  }

  syncIdInput.value = syncId;
  if (syncPassword) {
    syncPasswordInput.value = syncPassword;
    statusBadge.style.display = "flex";
  } else {
    statusBadge.style.display = "none";
  }

  // Save Config
  btnSave.addEventListener("click", async () => {
    const enteredPassword = syncPasswordInput.value.trim();
    errorMsg.style.display = "none";

    if (!enteredPassword) {
      errorMsg.textContent = "Error: E2EE Sync Password is mandatory. Please provide a password.";
      errorMsg.style.display = "block";
      return;
    }

    if (syncIdInput.value.trim().length < 8) {
      errorMsg.textContent = "Error: Sync Profile ID must be at least 8 characters.";
      errorMsg.style.display = "block";
      return;
    }

    const newSyncId = syncIdInput.value.trim();

    await chrome.storage.local.set({
      [STORAGE_KEYS.SYNC_ID]: newSyncId,
      [STORAGE_KEYS.SYNC_PASSWORD]: enteredPassword
    });

    // Notify service worker of key updates immediately
    chrome.runtime.sendMessage({
      type: "CONFIG_UPDATED",
      syncId: newSyncId,
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
  btnRegen.addEventListener("click", () => {
    if (confirm("Are you sure you want to regenerate your Sync ID? Devices using the old ID will lose synchronization.")) {
      const newId = generateSecureId(16);
      syncIdInput.value = newId;
      statusBadge.style.display = "none"; // Hide active badge until saved
    }
  });
});
