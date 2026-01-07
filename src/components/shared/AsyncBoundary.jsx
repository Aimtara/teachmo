import React, { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createLogger } from '@/utils/logger';

const logger = createLogger('async-boundary');

// Higher-order component for handling async errors
export const withAsyncErrorBoundary = (WrappedComponent, fallbackComponent) => {
  class AsyncErrorBoundary extends Component {
    constructor(props) {
      super(props);
      this.state = {
        hasAsyncError: false,
        asyncError: null
      };
    }

    static getDerivedStateFromError(error) {
      return { hasAsyncError: true, asyncError: error };
    }

    componentDidCatch(error, errorInfo) {
      logger.error('Async error caught', error, errorInfo);
      
      // Report to error tracking service if available
      if (window.reportError) {
        window.reportError(error, { component: WrappedComponent.name, ...errorInfo });
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
              <p className="text-gray-600 mb-4">
                We encountered an error while loading this section.
              </p>
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

// Hook for handling async operations with error boundaries
export const useAsyncSafe = () => {
  const handleAsyncError = (error) => {
    // Force error boundary to catch this
    setTimeout(() => {
      throw error;
    }, 0);
  };

  const safeAsync = async (asyncFn) => {
    try {
      return await asyncFn();
    } catch (error) {
      handleAsyncError(error);
      return null;
    }
  };

  return { safeAsync };
};
