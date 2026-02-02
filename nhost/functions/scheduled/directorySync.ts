/*
 * Scheduled function to sync the school directory.
 *
 * This function is designed to be invoked by Nhost's scheduler.
 * It proxies the call to the existing `sync-directory-sources`
 * function using the configured cron token, removing the need for
 * manual button clicks to keep the directory in sync.
 */

import syncDirectorySources from '../sync-directory-sources';

export default async (req: any, res: any) => {
  const cronToken = String(process.env.DIRECTORY_SYNC_TOKEN ?? '');
  if (!cronToken) {
    return res.status(500).json({ ok: false, error: 'missing_directory_sync_token' });
  }

  const proxyReq = {
    ...req,
    method: 'POST',
    headers: {
      ...(req.headers ?? {}),
      authorization: `Bearer ${cronToken}`,
    },
    body: {
      ...(req.body ?? {}),
      limit: Number.isNaN(Number((req.body ?? {}).limit ?? 25))
        ? 25
        : Number((req.body ?? {}).limit ?? 25),
    },
  };

  return syncDirectorySources(proxyReq, res);
};
