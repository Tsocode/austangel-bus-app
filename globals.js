// Global polyfills for Expo 58 + React Native 0.88 compatibility
// This must be imported FIRST before anything else

// Intercept TurboModuleRegistry to prevent native module errors in Expo Go
if (typeof global.__turboModuleProxy === 'undefined') {
  const mockTurboModule = {
    readAsText: () => '',
    readAsDataURL: () => 'data:text/plain;base64,',
    readAsArrayBuffer: () => new ArrayBuffer(0),
  };

  if (typeof global.TurboModuleRegistry === 'undefined') {
    global.TurboModuleRegistry = {
      get: () => mockTurboModule,
      getEnforcing: () => mockTurboModule,
    };
  } else {
    const originalGet = global.TurboModuleRegistry.get;
    const originalGetEnforcing = global.TurboModuleRegistry.getEnforcing;
    
    global.TurboModuleRegistry.get = function(name) {
      try {
        return originalGet.call(this, name);
      } catch (e) {
        console.warn(`TurboModule ${name} not found, returning mock`);
        return mockTurboModule;
      }
    };
    
    global.TurboModuleRegistry.getEnforcing = function(name) {
      if (name === 'FileReaderModule') {
        return mockTurboModule;
      }
      try {
        return originalGetEnforcing.call(this, name);
      } catch (e) {
        console.warn(`TurboModule ${name} not found, returning mock`);
        return mockTurboModule;
      }
    };
  }
}

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

