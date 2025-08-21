import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

export default function reportWebVitals(onPerfEntry) {
  const handler =
    onPerfEntry && onPerfEntry instanceof Function
      ? onPerfEntry
      : (metric) => console.log('[Web Vitals]', metric.name, metric.value);
  onCLS(handler);
  onINP(handler);
  onLCP(handler);
  onFCP(handler);
  onTTFB(handler);
}
