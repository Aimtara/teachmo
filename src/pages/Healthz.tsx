import { APP_ENV, BUILD_SHA, BUILD_TIME } from '@/generated/buildMeta';

const NHOST_CONFIGURED = Boolean(import.meta.env.VITE_NHOST_BACKEND_URL);
const MAINTENANCE_MODE = String(import.meta.env.VITE_MAINTENANCE_MODE ?? '').toLowerCase() === 'true';

const status = NHOST_CONFIGURED ? 'ok' : 'degraded';

const payload = {
  status,
  build: {
    sha: BUILD_SHA,
    time: BUILD_TIME,
    env: APP_ENV
  },
  nhostConfigured: NHOST_CONFIGURED,
  maintenanceMode: MAINTENANCE_MODE
};

export default function Healthz() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-12">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Health check</h1>
          <p className="text-sm text-muted-foreground">
            Public deploy verification endpoint for ops and automated checks.
          </p>
        </header>

        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Status</span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                status === 'ok'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200'
              }`}
            >
              {status}
            </span>
          </div>

          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Build SHA</dt>
              <dd className="font-mono text-xs">{BUILD_SHA}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Build time</dt>
              <dd>{BUILD_TIME}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Environment</dt>
              <dd>{APP_ENV}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Nhost configured</dt>
              <dd>{NHOST_CONFIGURED ? 'yes' : 'no'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Maintenance mode</dt>
              <dd>{MAINTENANCE_MODE ? 'enabled' : 'disabled'}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground">Raw payload</p>
          <pre className="mt-2 overflow-auto rounded-md bg-background p-4 text-xs">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </section>
      </div>
    </main>
  );
}
