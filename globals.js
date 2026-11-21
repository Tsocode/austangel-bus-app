// Global polyfills for Expo 58 + React Native 0.88 compatibility
// This must be imported FIRST before anything else
// Runs at module evaluation time, before Hermes engine fully initializes

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

global.TurboModuleRegistry = TurboModuleRegistryMock;

// ============================================================================
// Global API Polyfills (FormData, Blob, FileReader, File)
// ============================================================================

if (typeof global.FormData === 'undefined') {
  global.FormData = class FormData {
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

if (typeof global.FileReader === 'undefined') {
  global.FileReader = class FileReader {
    readAsText(blob) {}
    readAsDataURL(blob) {}
    readAsArrayBuffer(blob) {}
  };
}

if (typeof global.Blob === 'undefined') {
  global.Blob = class Blob {
    constructor(parts = [], options = {}) {
      this.parts = parts;
      this.type = options.type || '';
    }
  };
}

if (typeof global.File === 'undefined') {
  global.File = class File extends global.Blob {
    constructor(parts = [], filename = '', options = {}) {
      super(parts, options);
      this.name = filename;
    }
  };
}

// ============================================================================
// URL and URLSearchParams Polyfills
// ============================================================================

if (typeof global.URL === 'undefined') {
  global.URL = class URL {
    constructor(url, base) {
      this.href = url;
      this.pathname = '';
      this.search = '';
    }
  };
}

if (typeof global.URLSearchParams === 'undefined') {
  global.URLSearchParams = class URLSearchParams {
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


