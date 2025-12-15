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

const getStorage = (session = false) => session ? sessionStorage : localStorage;

export const secureStorage = {
  setItem: (key, value, { session = false } = {}) => {
    const storage = getStorage(session);
    const serialized = serialize(value);

    if (serialized === undefined) return;

    storage.setItem(key, serialized);
  },
  getItem: (key, { session = false } = {}) => {
    const storage = getStorage(session);
    const storedValue = storage.getItem(key);

    return deserialize(storedValue);
  },
  removeItem: (key, { session = false } = {}) => {
    const storage = getStorage(session);

    storage.removeItem(key);
  },
  clear: ({ session = false } = {}) => {
    const storage = getStorage(session);

    storage.clear();
  },
};

export default secureStorage;
