/**
 * Pre-environment polyfills loaded BEFORE any module is imported.
 * Must be CommonJS (.cjs) because setupFiles runs in Node context.
 */
const { webcrypto } = require('node:crypto');
const { TextEncoder, TextDecoder } = require('node:util');

// Node 18+ has these on globalThis
const forceGlobal = (name, value) => {
  if (typeof value !== 'undefined') {
    global[name] = value;
    globalThis[name] = value;
  }
};

forceGlobal('crypto', webcrypto);
forceGlobal('TextEncoder', TextEncoder);
forceGlobal('TextDecoder', TextDecoder);
