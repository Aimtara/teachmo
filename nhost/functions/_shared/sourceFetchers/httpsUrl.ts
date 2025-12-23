import { applySecrets, DirectorySourceSecrets } from './secrets';

type HttpsSourceConfig = {
  url?: string;
  headers?: Record<string, string>;
};

export async function fetchHttpsUrlSource(params: {
  sourceId: string;
  config: HttpsSourceConfig;
  secrets: DirectorySourceSecrets;
}) {
  const url = String(params.config?.url ?? '').trim();
  if (!url) throw new Error('missing_url');

  const secretsForSource = params.secrets?.[params.sourceId] ?? {};
  const headers = Object.entries(params.config?.headers ?? {}).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      const interpolated = applySecrets(String(value ?? ''), secretsForSource);
      if (interpolated) acc[key] = interpolated;
      return acc;
    },
    {}
  );

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const csvText = await response.text();
  return { csvText, sourceRef: url };
}
