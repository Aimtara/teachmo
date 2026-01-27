import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { Role } from '@/security/permissions';

type WidgetLoader = () => Promise<ReactNode> | ReactNode;

type AdaptiveDashboardProps = {
  role: Role;
  widgetLoaders: Partial<Record<Role, WidgetLoader[]>>;
  fallbackWidget?: ReactNode | (() => ReactNode);
};

function resolveFallback(fallback?: ReactNode | (() => ReactNode)) {
  if (!fallback) return null;
  return typeof fallback === 'function' ? (fallback as () => ReactNode)() : fallback;
}

export default function AdaptiveDashboard({ role, widgetLoaders, fallbackWidget }: AdaptiveDashboardProps) {
  const [widgets, setWidgets] = useState<ReactNode[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loaders = useMemo(() => widgetLoaders[role] ?? [], [role, widgetLoaders]);

  useEffect(() => {
    let cancelled = false;
    const loadWidgets = async () => {
      setIsLoading(true);
      setErrors([]);
      const results = await Promise.allSettled(loaders.map((loader) => Promise.resolve().then(loader)));

      if (cancelled) return;

      const successful = results.filter((result): result is PromiseFulfilledResult<ReactNode> => result.status === 'fulfilled');
      const rejected = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');

      const nextWidgets = successful.map((result) => result.value);
      if (nextWidgets.length === 0) {
        const fallback = resolveFallback(fallbackWidget);
        if (fallback) {
          setWidgets([fallback]);
          setErrors(rejected.map((result) => String(result.reason)));
          setIsLoading(false);
          return;
        }
      }

      if (rejected.length > 0 && fallbackWidget) {
        nextWidgets.push(resolveFallback(fallbackWidget));
      }

      setWidgets(nextWidgets);
      setErrors(rejected.map((result) => String(result.reason)));
      setIsLoading(false);
    };

    loadWidgets();
    return () => {
      cancelled = true;
    };
  }, [fallbackWidget, loaders]);

  return (
    <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Adaptive dashboard</p>
          <p className="text-sm text-gray-600">Widgets tailored to the active role: {role.replace('_', ' ')}.</p>
        </div>
        {isLoading ? <span className="text-xs text-gray-500">Loading…</span> : null}
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {widgets.length > 0
          ? widgets.map((widget, index) => (
              <div key={index} className="rounded border border-gray-100 bg-gray-50 p-3">
                {widget}
              </div>
            ))
          : null}
      </div>

      {errors.length > 0 ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Some widgets failed to load and were replaced with fallbacks. Details: {errors.join('; ')}
        </div>
      ) : null}
    </section>
  );
}

export { AdaptiveDashboard };
