import { NhostClient } from '@nhost/nhost-js';

const backendUrl = String(import.meta.env.VITE_NHOST_BACKEND_URL || '').trim();
const subdomain = String(import.meta.env.VITE_NHOST_SUBDOMAIN || '').trim();
const region = String(import.meta.env.VITE_NHOST_REGION || '').trim();

const nhostConfig = backendUrl
  ? { backendUrl }
  : {
      subdomain: subdomain || 'localhost',
      region,
    };

export const nhost = new NhostClient(nhostConfig);
