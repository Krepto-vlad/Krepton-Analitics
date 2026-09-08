const { TextDecoder, TextEncoder } = require('util');
const { webcrypto } = require('crypto');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

if (typeof global.crypto?.randomUUID !== 'function') {
  global.crypto = webcrypto;
}

if (typeof global.BroadcastChannel !== 'function') {
  global.BroadcastChannel = class BroadcastChannel {
    constructor() {}
    addEventListener() {}
    removeEventListener() {}
    postMessage() {}
    close() {}
  };
}

if (typeof global.ResizeObserver !== 'function') {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
