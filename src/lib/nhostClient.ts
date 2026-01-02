import { createClient, type NhostClient } from '@nhost/nhost-js';

const backendUrl = import.meta.env.VITE_NHOST_BACKEND_URL || 'http://localhost:1337';

export const nhost: NhostClient = createClient({
  backendUrl,
});
