import { NhostClient } from '@nhost/nhost-js';
import { envString } from '@/config/env';

const backendUrl = envString('VITE_NHOST_BACKEND_URL');
const subdomain = envString('VITE_NHOST_SUBDOMAIN');
const region = envString('VITE_NHOST_REGION');

const nhostConfig = backendUrl
  ? { backendUrl }
  : {
      subdomain: subdomain || 'localhost',
      region,
    };

export const nhost = new NhostClient(nhostConfig);
