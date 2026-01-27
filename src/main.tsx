import './index.css';
// Install global console logging interception. This must be imported before
// any components are rendered so that all console.error and console.warn
// calls are forwarded to the central logger without causing recursion.
import { installConsoleLogger } from './utils/installConsoleLogger';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import './observability/sentry';
import { installTelemetryAutoFlush } from './observability/telemetry';

// Initialize the console logger before anything else runs. This ensures
// that any log statements from imports or other setup code are captured.
installConsoleLogger();

installTelemetryAutoFlush();
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
