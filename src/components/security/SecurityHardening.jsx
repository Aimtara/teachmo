const serialize = value => {
  if (value === undefined) return undefined;
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error('storageHelper: failed to serialize value', error);
    return undefined;
  }
};

const deserialize = value => {
  if (value === null || value === undefined) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.error('storageHelper: failed to deserialize value', error);
    return null;
  }
};

export const storageHelper = {
  setItem: (key, value, { session = false } = {}) => {
    const storage = session ? sessionStorage : localStorage;
    const serialized = serialize(value);

    if (serialized === undefined) return;

    storage.setItem(key, serialized);
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

export default storageHelper;
