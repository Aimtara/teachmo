import { Component, ComponentType, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createLogger } from '@/utils/logger';

const logger = createLogger('async-boundary');

type FallbackComponent = (error: unknown, retry: () => void) => ReactNode;

type AsyncBoundaryState = {
  hasAsyncError: boolean;
  asyncError: unknown;
};

type ReportErrorWindow = Window & {
  reportError?: (error: unknown, details?: Record<string, unknown>) => void;
};

export const withAsyncErrorBoundary = <P extends object>(
  WrappedComponent: ComponentType<P>,
  fallbackComponent?: FallbackComponent,
) => {
  class AsyncErrorBoundary extends Component<P, AsyncBoundaryState> {
    constructor(props: P) {
      super(props);
      this.state = {
        hasAsyncError: false,
        asyncError: null,
      };
    }

    static getDerivedStateFromError(error: unknown): AsyncBoundaryState {
      return { hasAsyncError: true, asyncError: error };
    }

    componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
      logger.error('Async error caught', error, errorInfo);

      const typedWindow = window as ReportErrorWindow;
      if (typedWindow.reportError) {
        typedWindow.reportError(error, {
          component: WrappedComponent.displayName || WrappedComponent.name,
          componentStack: errorInfo.componentStack,
        });
      }
    }

    handleRetry = () => {
      this.setState({ hasAsyncError: false, asyncError: null });
    };

    render() {
      if (this.state.hasAsyncError) {
        if (fallbackComponent) {
          return fallbackComponent(this.state.asyncError, this.handleRetry);
        }

        return (
          <Card className="m-4">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
              <h3 className="text-lg font-semibold mb-2">Unable to Load Content</h3>
              <p className="text-gray-600 mb-4">We encountered an error while loading this section.</p>
              <Button onClick={this.handleRetry} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        );
      }

      return <WrappedComponent {...this.props} />;
    }
  }

  AsyncErrorBoundary.displayName = `withAsyncErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;
  return AsyncErrorBoundary;
};

export const useAsyncSafe = () => {
  const handleAsyncError = (error: unknown) => {
    window.setTimeout(() => {
      throw error;
    }, 0);
  };

  const safeAsync = async <T>(asyncFn: () => Promise<T>): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleAsyncError(error);
      return null;
    }
  };

  return { safeAsync };
};
