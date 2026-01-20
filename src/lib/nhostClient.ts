import { NhostClient } from '@nhost/nhost-js';

const backendUrl = import.meta.env.VITE_NHOST_BACKEND_URL || 'http://localhost:1337';

// Nhost React v3 expects the class-based SDK export, so instantiate NhostClient directly.
export const nhost = new NhostClient({
  backendUrl,
});
