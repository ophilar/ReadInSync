// test/setup.js
import { jest } from '@jest/globals';
import { webcrypto } from 'node:crypto';
import { TextEncoder, TextDecoder } from 'node:util';

class StatefulStorageArea {
  constructor() { this.data = {}; }
  async get(keys) {
    if (keys === null || keys === undefined) return { ...this.data };
    if (typeof keys === 'string') return { [keys]: this.data[keys] };
    if (Array.isArray(keys)) {
      const res = {};
      keys.forEach(k => res[k] = this.data[k]);
      return res;
    }
    const res = { ...keys };
    for (const k in keys) if (this.data[k] !== undefined) res[k] = this.data[k];
    return res;
  }
  async set(items) { Object.assign(this.data, items); }
  async remove(keys) {
    if (typeof keys === 'string') delete this.data[keys];
    else if (Array.isArray(keys)) keys.forEach(k => delete this.data[k]);
  }
  async clear() { this.data = {}; }
}

const mockLocalStorage = new StatefulStorageArea();

globalThis.chrome = {
  storage: {
    local: mockLocalStorage,
    onChanged: { addListener: jest.fn() },
  },
  runtime: {
    sendMessage: jest.fn().mockResolvedValue({}),
    onMessage: { addListener: jest.fn(), removeListener: jest.fn() },
    lastError: null,
  },
  tabs: {
    sendMessage: jest.fn().mockResolvedValue({}),
    onUpdated: { addListener: jest.fn() },
  }
};

globalThis.crypto = webcrypto;
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;

beforeEach(() => {
  jest.clearAllMocks();
  mockLocalStorage.data = {};
  chrome.runtime.lastError = null;
});
