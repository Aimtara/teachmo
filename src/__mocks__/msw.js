const createHandler = () => () => undefined;

export const rest = new Proxy(
  {},
  {
    get: () => createHandler,
  }
);

export const graphql = new Proxy(
  {},
  {
    get: () => createHandler,
  }
);

export const setupWorker = () => ({
  start: () => undefined,
  stop: () => undefined,
  use: () => undefined,
});
