// JS compatibility shim – see corsOrigins.ts for the typed source.

export function isExplicitlyAllowedReplitOrigin(
  origin,
  allowReplitOrigins = String(process.env.ALLOW_REPLIT_ORIGINS || '').toLowerCase() === 'true'
) {
  if (!allowReplitOrigins || !origin) return false;

  return (
    /^https:\/\/[a-z0-9.-]+\.replit\.dev$/i.test(origin) ||
    /^https:\/\/[a-z0-9.-]+\.repl\.co$/i.test(origin) ||
    /^https:\/\/[a-z0-9.-]+\.replit\.app$/i.test(origin)
  );
}
