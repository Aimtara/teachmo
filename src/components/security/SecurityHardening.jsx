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
    const storage = session ? sessionStorage : localStorage;
    const serialized = serialize(value);

    if (serialized === undefined) return;

    try {
      storage.setItem(key, serialized);
    } catch (error) {
      console.error('secureStorage: failed to set item', error);
    }
  },
  getItem: (key, { session = false } = {}) => {
    const storage = session ? sessionStorage : localStorage;
    const storedValue = storage.getItem(key);

    return deserialize(storedValue);
  },
  removeItem: (key, { session = false } = {}) => {
    const storage = session ? sessionStorage : localStorage;

    storage.removeItem(key);
  },
  clear: ({ session = false } = {}) => {
    const storage = session ? sessionStorage : localStorage;

    storage.clear();
  },
};

export default secureStorage;
