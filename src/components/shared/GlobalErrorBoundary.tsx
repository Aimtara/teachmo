import { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { logAuditEvent } from '@/api/functions';
import { logger } from '@/lib/logger';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
};

export default class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substring(2)}`,
    };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Global Error Boundary caught an error', {
      errorId: this.state.errorId,
      name: error?.name,
      message: error?.message,
      path: typeof window !== 'undefined' ? window.location?.pathname : undefined,
    });

    this.setState({ errorInfo });

    const componentHint =
      errorInfo?.componentStack
        ?.split('\n')
        .map((s) => s.trim())
        .filter(Boolean)[0] || 'unknown';

    try {
      Sentry.captureException(error, {
        tags: { errorId: this.state.errorId || 'unknown' },
        extra: { component: componentHint, boundary: 'GlobalErrorBoundary' },
      });
    } catch {
      // ignore
    }

    try {
      await logAuditEvent({
        action: 'ui.error',
        resource_type: 'component',
        resource_id: componentHint,
        details: {
          error: error?.message,
          name: error?.name,
          errorId: this.state.errorId,
          path: typeof window !== 'undefined' ? window.location?.pathname : undefined,
          errorBoundary: 'GlobalErrorBoundary',
        },
        severity: 'high',
      });
    } catch (logError) {
      logger.warn('Failed to log error to audit system', { logError });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = createPageUrl('Dashboard');
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-xl text-gray-900">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 text-center">
                We've encountered an unexpected error. Our team has been notified.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="bg-gray-100 p-3 rounded text-xs">
                  <summary className="cursor-pointer font-medium">Error Details</summary>
                  <pre className="mt-2 whitespace-pre-wrap">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              {this.state.errorId && (
                <p className="text-xs text-gray-500 text-center">Error ID: {this.state.errorId}</p>
              )}

              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={this.handleRetry} className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
                <Button onClick={this.handleGoHome} className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
