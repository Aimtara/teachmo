/**
 * Security Hardening Module
 * 
 * This module provides a secure wrapper around browser storage (localStorage and sessionStorage)
 * with automatic JSON serialization and deserialization. It handles errors gracefully and provides
 * a consistent API for storing and retrieving data in the browser.
 * 
 * @module SecurityHardening
 * @example
 * import { secureStorage } from './components/security/SecurityHardening';
 * 
 * // Store data in localStorage
 * secureStorage.setItem('user', { id: 1, name: 'John' });
 * 
 * // Store data in sessionStorage
 * secureStorage.setItem('tempData', { token: 'abc123' }, { session: true });
 * 
 * // Retrieve data
 * const user = secureStorage.getItem('user');
 * 
 * // Remove specific item
 * secureStorage.removeItem('user');
 * 
 * // Clear all storage
 * secureStorage.clear();
 */

/**
 * Serializes a value to JSON string for storage.
 * 
 * @private
 * @param {*} value - The value to serialize
 * @returns {string|undefined} The JSON string representation, or undefined if serialization fails or value is undefined
 * @example
 * serialize({ name: 'John' }); // Returns: '{"name":"John"}'
 * serialize(undefined); // Returns: undefined
 */
const serialize = value => {
  if (value === undefined) return undefined;
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error('secureStorage: failed to serialize value', error);
    return undefined;
  }
};

/**
 * Deserializes a JSON string back to its original value.
 * 
 * @private
 * @param {string|null|undefined} value - The JSON string to deserialize
 * @returns {*|null} The deserialized value, or null if deserialization fails or value is null/undefined
 * @example
 * deserialize('{"name":"John"}'); // Returns: { name: 'John' }
 * deserialize(null); // Returns: null
 */
const deserialize = value => {
  if (value === null || value === undefined) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.error('secureStorage: failed to deserialize value', error);
    return null;
  }
};

/**
 * Secure storage API for managing browser storage with automatic JSON serialization.
 * Provides methods to store, retrieve, and manage data in localStorage or sessionStorage.
 * 
 * @namespace secureStorage
 */
export const secureStorage = {
  /**
   * Stores a value in browser storage with automatic JSON serialization.
   * 
   * @memberof secureStorage
   * @param {string} key - The storage key
   * @param {*} value - The value to store (will be JSON serialized)
   * @param {Object} [options={}] - Storage options
   * @param {boolean} [options.session=false] - If true, uses sessionStorage; otherwise uses localStorage
   * @returns {void}
   * @example
   * // Store in localStorage (default)
   * secureStorage.setItem('preferences', { theme: 'dark', language: 'en' });
   * 
   * // Store in sessionStorage
   * secureStorage.setItem('authToken', 'abc123', { session: true });
   * 
   * // Store complex objects
   * secureStorage.setItem('cart', [{ id: 1, qty: 2 }, { id: 2, qty: 1 }]);
   */
  setItem: (key, value, { session = false } = {}) => {
    const storage = session ? sessionStorage : localStorage;
    const serialized = serialize(value);

    if (serialized === undefined) return;

    storage.setItem(key, serialized);
  },
  
  /**
   * Retrieves and deserializes a value from browser storage.
   * 
   * @memberof secureStorage
   * @param {string} key - The storage key to retrieve
   * @param {Object} [options={}] - Storage options
   * @param {boolean} [options.session=false] - If true, reads from sessionStorage; otherwise from localStorage
   * @returns {*|null} The deserialized value, or null if not found or deserialization fails
   * @example
   * // Retrieve from localStorage
   * const preferences = secureStorage.getItem('preferences');
   * console.log(preferences.theme); // 'dark'
   * 
   * // Retrieve from sessionStorage
   * const token = secureStorage.getItem('authToken', { session: true });
   */
  getItem: (key, { session = false } = {}) => {
    const storage = session ? sessionStorage : localStorage;
    const storedValue = storage.getItem(key);

    return deserialize(storedValue);
  },
  
  /**
   * Removes a specific item from browser storage.
   * 
   * @memberof secureStorage
   * @param {string} key - The storage key to remove
   * @param {Object} [options={}] - Storage options
   * @param {boolean} [options.session=false] - If true, removes from sessionStorage; otherwise from localStorage
   * @returns {void}
   * @example
   * // Remove from localStorage
   * secureStorage.removeItem('preferences');
   * 
   * // Remove from sessionStorage
   * secureStorage.removeItem('authToken', { session: true });
   */
  removeItem: (key, { session = false } = {}) => {
    const storage = session ? sessionStorage : localStorage;

    storage.removeItem(key);
  },
  
  /**
   * Clears all items from browser storage.
   * 
   * @memberof secureStorage
   * @param {Object} [options={}] - Storage options
   * @param {boolean} [options.session=false] - If true, clears sessionStorage; otherwise clears localStorage
   * @returns {void}
   * @example
   * // Clear all localStorage
   * secureStorage.clear();
   * 
   * // Clear all sessionStorage
   * secureStorage.clear({ session: true });
   */
  clear: ({ session = false } = {}) => {
    const storage = session ? sessionStorage : localStorage;

    storage.clear();
  },
};

export default secureStorage;
