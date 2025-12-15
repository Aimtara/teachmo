const serialize = value => {
  if (value === undefined) return undefined;
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error('secureStorage: failed to serialize value', error);
    return undefined;
  }
};

const deserialize = value => {
  if (value === null || value === undefined) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.error('secureStorage: failed to deserialize value', error);
    return null;
  }
};

export const secureStorage = {
  setItem: (key, value, { session = false } = {}) => {
    if (typeof key !== 'string' || key.trim() === '') {
      console.error('secureStorage.setItem: key must be a non-empty string');
      return;
    }

    const storage = session ? sessionStorage : localStorage;
    const serialized = serialize(value);

    if (serialized === undefined) return;

    try {
      storage.setItem(key, serialized);
    } catch (error) {
      console.error('secureStorage.setItem: failed to store value', error);
    }
  },
  getItem: (key, { session = false } = {}) => {
    if (typeof key !== 'string' || key.trim() === '') {
      console.error('secureStorage.getItem: key must be a non-empty string');
      return null;
    }

    const storage = session ? sessionStorage : localStorage;

    try {
      const storedValue = storage.getItem(key);
      return deserialize(storedValue);
    } catch (error) {
      console.error('secureStorage.getItem: failed to retrieve value', error);
      return null;
    }
  },
  removeItem: (key, { session = false } = {}) => {
    if (typeof key !== 'string' || key.trim() === '') {
      console.error('secureStorage.removeItem: key must be a non-empty string');
      return;
    }

    const storage = session ? sessionStorage : localStorage;

    try {
      storage.removeItem(key);
    } catch (error) {
      console.error('secureStorage.removeItem: failed to remove value', error);
    }
  },
  clear: ({ session = false } = {}) => {
    const storage = session ? sessionStorage : localStorage;

    storage.clear();
  },
};

export default secureStorage;
