const STORAGE_NAMESPACE = 'secure-storage';
const encoder = new TextEncoder();

const hasBrowserCrypto =
  typeof window !== 'undefined' &&
  Boolean(window.crypto?.subtle) &&
  typeof window.crypto.getRandomValues === 'function';

function getScopedKey(userId, key) {
  return `${STORAGE_NAMESPACE}:${userId}:${key}`;
}

async function deriveKey(passphrase, userId) {
  const salt = encoder.encode(`${STORAGE_NAMESPACE}:${userId}`);
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptValue(value, cryptoKey) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedValue = encoder.encode(JSON.stringify(value));
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    cryptoKey,
    encodedValue,
  );

  return {
    iv: Array.from(iv),
    data: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
  };
}

async function decryptValue(storedValue, cryptoKey) {
  if (!storedValue?.iv || !storedValue?.data) return null;

  const iv = new Uint8Array(storedValue.iv);
  const binary = Uint8Array.from(atob(storedValue.data), (char) => char.charCodeAt(0));
  const plaintext = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    cryptoKey,
    binary,
  );

  try {
    return JSON.parse(new TextDecoder().decode(plaintext));
  } catch (error) {
    console.warn('SecureStorage: failed to parse decrypted value; clearing entry.', error);
    return null;
  }
}

/**
 * Secure storage helper that avoids relying on build-time secrets.
 *
 * - Does NOT use Vite env secrets (those ship in the JS bundle and are not secret).
 * - Derives per-user keys from credentials provided at runtime (e.g., login password or session token).
 * - If no passphrase is provided, it refuses to store values to avoid a false sense of security.
 */
export async function createSecureStorage({ userId, passphrase, backingStore = window?.localStorage } = {}) {
  const isUsable = Boolean(backingStore) && typeof backingStore.setItem === 'function';

  if (!hasBrowserCrypto || !isUsable) {
    console.warn('SecureStorage: crypto or storage is unavailable; cannot store sensitive data client-side.');
    return {
      async setItem() {
        return false;
      },
      async getItem() {
        return null;
      },
      async removeItem() {
        return false;
      },
      async clear() {
        return false;
      },
    };
  }

  if (!userId || !passphrase) {
    console.warn(
      'SecureStorage: missing userId or passphrase; refusing to use a faux "encryption secret" shipped in the client bundle. ' +
        'Provide per-user credentials or avoid persisting sensitive data.',
    );
    return {
      async setItem() {
        return false;
      },
      async getItem() {
        return null;
      },
      async removeItem() {
        return false;
      },
      async clear() {
        return false;
      },
    };
  }

  const cryptoKey = await deriveKey(passphrase, userId);

  return {
    async setItem(key, value) {
      try {
        const payload = await encryptValue(value, cryptoKey);
        backingStore.setItem(getScopedKey(userId, key), JSON.stringify(payload));
        return true;
      } catch (error) {
        console.error('SecureStorage: failed to persist encrypted value', error);
        return false;
      }
    },

    async getItem(key) {
      try {
        const storedValue = backingStore.getItem(getScopedKey(userId, key));
        if (!storedValue) return null;
        return decryptValue(JSON.parse(storedValue), cryptoKey);
      } catch (error) {
        console.error('SecureStorage: failed to read encrypted value', error);
        return null;
      }
    },

    async removeItem(key) {
      try {
        backingStore.removeItem(getScopedKey(userId, key));
        return true;
      } catch (error) {
        console.error('SecureStorage: failed to remove encrypted value', error);
        return false;
      }
    },

    async clear() {
      try {
        const keysToRemove = [];
        for (let i = 0; i < backingStore.length; i += 1) {
          const storageKey = backingStore.key(i);
          if (storageKey?.startsWith(`${STORAGE_NAMESPACE}:${userId}:`)) {
            keysToRemove.push(storageKey);
          }
        }

        keysToRemove.forEach((storageKey) => backingStore.removeItem(storageKey));
        return true;
      } catch (error) {
        console.error('SecureStorage: failed to clear encrypted values', error);
        return false;
      }
    },
  };
}

export default createSecureStorage;
