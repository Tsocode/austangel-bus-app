/**
 * FileReader Mock for Expo/React Native
 * 
 * This is a lightweight mock for the FileReader API that is not available
 * in React Native / Expo Go. It prevents crashes when third-party libraries
 * (like map libraries) try to reference FileReader at module-load time.
 * 
 * Hermes evaluates top-level module scopes immediately during bytecode
 * initialization, so we need this mock available BEFORE any library
 * that references FileReader tries to load.
 */

class MockFileReader {
  constructor() {
    this.readyState = 0; // EMPTY
    this.result = null;
    this.error = null;
    this.onload = null;
    this.onerror = null;
    this.onprogress = null;
    this.onloadstart = null;
    this.onloadend = null;
  }

  /**
   * Read blob as text - mocked, returns empty string
   */
  readAsText(blob, encoding) {
    this.readyState = 1; // LOADING
    this._dispatchEvent('loadstart');
    
    setTimeout(() => {
      this.readyState = 2; // DONE
      this.result = '';
      this._dispatchEvent('load');
      this._dispatchEvent('loadend');
    }, 0);
  }

  /**
   * Read blob as data URL - mocked, returns empty data URL
   */
  readAsDataURL(blob) {
    this.readyState = 1; // LOADING
    this._dispatchEvent('loadstart');
    
    setTimeout(() => {
      this.readyState = 2; // DONE
      this.result = 'data:application/octet-stream;base64,';
      this._dispatchEvent('load');
      this._dispatchEvent('loadend');
    }, 0);
  }

  /**
   * Read blob as array buffer - mocked, returns empty buffer
   */
  readAsArrayBuffer(blob) {
    this.readyState = 1; // LOADING
    this._dispatchEvent('loadstart');
    
    setTimeout(() => {
      this.readyState = 2; // DONE
      this.result = new ArrayBuffer(0);
      this._dispatchEvent('load');
      this._dispatchEvent('loadend');
    }, 0);
  }

  /**
   * Abort the read operation
   */
  abort() {
    this.readyState = 2; // DONE
    this.error = new Error('FileReader.abort() called');
    this._dispatchEvent('abort');
    this._dispatchEvent('loadend');
  }

  /**
   * Dispatch event to listeners
   */
  _dispatchEvent(eventType) {
    const event = new Event(eventType);
    const handlerName = `on${eventType}`;
    
    if (this[handlerName] && typeof this[handlerName] === 'function') {
      this[handlerName](event);
    }
  }

  // Static constants for readyState
  static EMPTY = 0;
  static LOADING = 1;
  static DONE = 2;
}

// Set up static properties on instance
MockFileReader.prototype.EMPTY = 0;
MockFileReader.prototype.LOADING = 1;
MockFileReader.prototype.DONE = 2;

// Globally register the mock if not already defined
if (typeof global !== 'undefined' && !global.FileReader) {
  global.FileReader = MockFileReader;
}

module.exports = MockFileReader;
