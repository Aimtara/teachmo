const createServer = () => ({
  listen: () => undefined,
  resetHandlers: () => undefined,
  close: () => undefined,
  use: () => undefined,
});

export const setupServer = createServer;
