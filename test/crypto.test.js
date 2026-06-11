// test/crypto.test.js
import { deriveSyncKey, encryptPayload, decryptPayload } from "../extension/crypto.js";

describe("Crypto Module", () => {
  const password = "my-secret-password-123";
  const syncId = "sync-id-abc-123";

  test("deriveSyncKey produces a CryptoKey", async () => {
    const key = await deriveSyncKey(password, syncId);
    expect(key.type).toBe("secret");
    expect(key.algorithm.name).toBe("AES-GCM");
  });

  test("deriveSyncKey is deterministic", async () => {
    const key1 = await deriveSyncKey(password, syncId);
    const key2 = await deriveSyncKey(password, syncId);
    
    const originalPayload = { data: "test-determinism" };
    const { iv, ciphertext } = await encryptPayload(originalPayload, key1);
    
    // Decrypting payload encrypted with key1 using key2 should succeed and yield the same result
    const decrypted = await decryptPayload(ciphertext, iv, key2);
    expect(decrypted).toEqual(originalPayload);
  });

  test("deriveSyncKey produces different keys for different sync IDs", async () => {
    const key1 = await deriveSyncKey(password, "sync-A");
    const key2 = await deriveSyncKey(password, "sync-B");
    
    const originalPayload = { data: "test-difference" };
    const { iv, ciphertext } = await encryptPayload(originalPayload, key1);
    
    // Decrypting payload encrypted with key1 using key2 should fail (throw an error)
    await expect(decryptPayload(ciphertext, iv, key2)).rejects.toThrow();
  });

  test("encrypt/decrypt cycle works", async () => {
    const key = await deriveSyncKey(password, syncId);
    const originalPayload = {
      url: "https://example.com/some/path",
      title: "Some Page Title",
      percent: 0.735
    };
    
    const { iv, ciphertext } = await encryptPayload(originalPayload, key);
    const decrypted = await decryptPayload(ciphertext, iv, key);
    
    expect(decrypted).toEqual(originalPayload);
  });

  test("decrypt fails with wrong key", async () => {
    const key1 = await deriveSyncKey(password, syncId);
    const key2 = await deriveSyncKey("wrong-password", syncId);
    const originalPayload = { url: "https://example.com" };
    
    const { iv, ciphertext } = await encryptPayload(originalPayload, key1);
    
    await expect(decryptPayload(ciphertext, iv, key2)).rejects.toThrow();
  });
});
