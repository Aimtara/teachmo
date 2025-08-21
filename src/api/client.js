export async function apiFetch(url, options = {}, retries = 3) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const error = new Error('API error');
      logError('API error', { url, status: response.status });
      throw error;
    }
    return response.json();
  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, (4 - retries) * 500));
      return apiFetch(url, options, retries - 1);
    }
    logError('API failure', { url, message: err.message });
    throw err;
  }
}

export function logError(message, meta) {
  console.error('[Audit]', message, meta);
}
