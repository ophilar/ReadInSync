/**
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
}
