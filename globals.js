// Global polyfills for Expo 58 + React Native 0.88 compatibility
// This must be imported FIRST before anything else
// Runs at module evaluation time, before Hermes engine fully initializes
// Works in both Hermes and Node.js (for Expo Router SSR)

// ============================================================================
// CRITICAL: Intercept TurboModuleRegistry and metro require BEFORE any native module loads
// ============================================================================

// Mock TurboModuleRegistry to intercept ALL native module loading attempts
// Do NOT spread the original because it may throw on getEnforcing
const TurboModuleRegistryMock = {
  // Catch all getEnforcing calls and return mock instead of throwing
  getEnforcing(name) {
    console.warn(`[Polyfill] TurboModuleRegistry.getEnforcing called for "${name}" - returning mock`);
    
    // Return appropriate mock based on module name
    if (name === 'FileReaderModule') {
      return {
        readAsText: () => '',
        readAsDataURL: () => 'data:text/plain;base64,',
        readAsArrayBuffer: () => new ArrayBuffer(0),
      };
    }
    
    if (name === 'NativeEventEmitter' || name === 'EventEmitter') {
      return {
        addListener: () => ({ remove: () => {} }),
        removeListener: () => {},
        removeAllListeners: () => {},
      };
    }

    if (name === 'BlobModule') {
      return {
        getConstants: () => ({ BLOB_URI_SCHEME: 'blob' }),
        addNetworkingHandler: () => {},
        enableBlobModule: () => {},
      };
    }
    
    // For any other module, return a generic mock object
    return new Proxy({}, {
      get: () => () => {},
    });
  },
  
  // Catch all get calls and return mock instead of null
  get(name) {
    console.warn(`[Polyfill] TurboModuleRegistry.get called for "${name}" - returning mock`);
    
    if (name === 'FileReaderModule') {
      return {
        readAsText: () => '',
        readAsDataURL: () => 'data:text/plain;base64,',
        readAsArrayBuffer: () => new ArrayBuffer(0),
      };
    }
    
    if (name === 'NativeEventEmitter' || name === 'EventEmitter') {
      return {
        addListener: () => ({ remove: () => {} }),
        removeListener: () => {},
        removeAllListeners: () => {},
      };
    }

    if (name === 'BlobModule') {
      return {
        getConstants: () => ({ BLOB_URI_SCHEME: 'blob' }),
        addNetworkingHandler: () => {},
        enableBlobModule: () => {},
      };
    }
    
    return new Proxy({}, {
      get: () => () => {},
    });
  },
};

// Use globalThis for compatibility with both Hermes and Node.js (SSR)
globalThis.TurboModuleRegistry = TurboModuleRegistryMock;

// ============================================================================
// Global API Polyfills (FormData, Blob, FileReader, File)
// Using globalThis for Hermes + Node.js compatibility
// ============================================================================

if (typeof globalThis.FormData === 'undefined') {
  globalThis.FormData = class FormData {
    constructor() {
      this.entries = [];
    }
    
    append(name, value) {
      this.entries.push([name, value]);
      return this;
    }
    
    delete(name) {
      this.entries = this.entries.filter(([k]) => k !== name);
    }
    
    get(name) {
      const entry = this.entries.find(([k]) => k === name);
      return entry ? entry[1] : null;
    }
    
    has(name) {
      return this.entries.some(([k]) => k === name);
    }
    
    [Symbol.iterator]() {
      return this.entries[Symbol.iterator]();
    }
  };
}

if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    constructor() {
      this.readyState = 0;
      this.result = null;
      this.error = null;
      this.onload = null;
      this.onerror = null;
      this.onprogress = null;
      this.onloadstart = null;
      this.onloadend = null;
    }
    
    readAsText(blob, encoding) {
      this.readyState = 1;
      this.result = '';
      this.readyState = 2;
      if (this.onload) this.onload();
    }
    
    readAsDataURL(blob) {
      this.readyState = 1;
      this.result = 'data:application/octet-stream;base64,';
      this.readyState = 2;
      if (this.onload) this.onload();
    }
    
    readAsArrayBuffer(blob) {
      this.readyState = 1;
      this.result = new ArrayBuffer(0);
      this.readyState = 2;
      if (this.onload) this.onload();
    }
    
    abort() {
      this.readyState = 2;
      this.error = new Error('FileReader.abort() called');
      if (this.onerror) this.onerror();
    }
  };
}

if (typeof globalThis.Blob === 'undefined') {
  globalThis.Blob = class Blob {
    constructor(parts = [], options = {}) {
      this.parts = parts;
      this.type = options.type || '';
    }
  };
}

if (typeof globalThis.File === 'undefined') {
  globalThis.File = class File extends globalThis.Blob {
    constructor(parts = [], filename = '', options = {}) {
      super(parts, options);
      this.name = filename;
    }
  };
}

// ============================================================================
// URL and URLSearchParams Polyfills
// ============================================================================

if (typeof globalThis.URL === 'undefined') {
  globalThis.URL = class URL {
    constructor(url, base) {
      this.href = url;
      this.pathname = '';
      this.search = '';
    }
  };
}

if (typeof globalThis.URLSearchParams === 'undefined') {
  globalThis.URLSearchParams = class URLSearchParams {
    constructor(init) {
      this.params = new Map();
      if (typeof init === 'string') {
        const pairs = init.split('&');
        pairs.forEach(pair => {
          const [key, value] = pair.split('=');
          this.params.set(decodeURIComponent(key), decodeURIComponent(value || ''));
        });
      }
    }

    get(name) {
      return this.params.get(name) || null;
    }

    has(name) {
      return this.params.has(name);
    }

    set(name, value) {
      this.params.set(name, value);
    }

    forEach(callback) {
      this.params.forEach((value, key) => {
        callback(value, key);
      });
    }

    toString() {
      const pairs = [];
      this.params.forEach((value, key) => {
        pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      });
      return pairs.join('&');
    }
  };
}


