import { NhostClient } from '@nhost/nhost-js';

const backendUrl = import.meta.env.VITE_NHOST_BACKEND_URL || 'http://localhost:1337';
const baseUrl = backendUrl.replace(/\/+$/, '');

// Nhost React v3 expects the class-based SDK export, so instantiate NhostClient directly.
export const nhost: NhostClient = new NhostClient({
  authUrl: `${baseUrl}/v1/auth`,
  storageUrl: `${baseUrl}/v1/storage`,
  graphqlUrl: `${baseUrl}/v1/graphql`,
  functionsUrl: `${baseUrl}/v1/functions`,
});
