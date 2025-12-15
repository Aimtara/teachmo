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

    storage.setItem(key, serialized);
  },
  getItem: (key, { session = false } = {}) => {
    if (typeof key !== 'string' || key.trim() === '') {
      console.error('secureStorage.getItem: key must be a non-empty string');
      return null;
    }

    const storage = session ? sessionStorage : localStorage;
    const storedValue = storage.getItem(key);

    return deserialize(storedValue);
  },
  removeItem: (key, { session = false } = {}) => {
    if (typeof key !== 'string' || key.trim() === '') {
      console.error('secureStorage.removeItem: key must be a non-empty string');
      return;
    }

    const storage = session ? sessionStorage : localStorage;

    storage.removeItem(key);
  },
  clear: ({ session = false } = {}) => {
    const storage = session ? sessionStorage : localStorage;

    storage.clear();
  },
};

export default secureStorage;
