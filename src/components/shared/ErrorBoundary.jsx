import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { createLogger } from '@/utils/logger';

const logger = createLogger('error-boundary');

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error: error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    logger.error('Uncaught error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="flex items-center justify-center h-full p-8 bg-gray-50">
          <div className="text-center max-w-lg">
            <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong.</h1>
            <p className="text-gray-600 mb-6">
              We've encountered an unexpected error. Please try refreshing the page.
            </p>
            {this.state.error && (
              <pre className="text-xs text-left bg-gray-100 p-3 rounded-md overflow-auto my-4 text-red-700 border border-red-200">
                {this.state.error.toString()}
              </pre>
            )}
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
