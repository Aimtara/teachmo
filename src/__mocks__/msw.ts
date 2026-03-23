const createHandler = () => () => undefined;

export const rest = new Proxy<Record<string, () => () => undefined>>(
  {},
  {
    get: () => createHandler
  }
);

export const graphql = new Proxy<Record<string, () => () => undefined>>(
  {},
  {
    get: () => createHandler
  }
);

export const setupWorker = () => ({
  start: () => undefined,
  stop: () => undefined,
  use: () => undefined
});
