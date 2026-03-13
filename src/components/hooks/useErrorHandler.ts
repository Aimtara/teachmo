import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { createLogger } from '@/utils/logger';
import * as Sentry from '@sentry/react';

const logger = createLogger('use-error-handler');

type ErrorWithMessage = {
  message?: string;
};

const getErrorMessage = (error: unknown): string => {
  if (!error) return '';
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as ErrorWithMessage).message ?? '');
  }

  return String(error);
};

export const useErrorHandler = () => {
  const [error, setError] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleError = (nextError: unknown, customMessage?: string) => {
    const safeMessage = getErrorMessage(nextError);
    logger.error('Error occurred', safeMessage);

    if (nextError instanceof Error) {
      Sentry.captureException(nextError);
    } else {
      Sentry.captureException(new Error(safeMessage));
    }

    setError(nextError);

    const rawErrorMessage = safeMessage;
    let errorMessage = customMessage || 'Something went wrong. Please try again.';

    if (rawErrorMessage.includes('Network') || rawErrorMessage.includes('Failed to fetch')) {
      errorMessage = 'Network error. Please check your connection and try again.';
    } else if (rawErrorMessage.includes('401') || rawErrorMessage.includes('Unauthorized')) {
      errorMessage = 'Your session has expired. Please sign in again.';
    } else if (rawErrorMessage.includes('403') || rawErrorMessage.includes('Forbidden')) {
      errorMessage = "You don't have permission to perform this action.";
    } else if (rawErrorMessage.includes('500')) {
      errorMessage = "Server error. We're working to fix this issue.";
    }

    toast({
      variant: 'destructive',
      title: 'Error',
      description: errorMessage,
    });
  };

  const executeAsync = async <T>(asyncFunction: () => Promise<T>) => {
    setIsLoading(true);
    setError(null);

    try {
      return await asyncFunction();
    } catch (nextError) {
      handleError(nextError);
      throw nextError;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    error,
    isLoading,
    handleError,
    executeAsync,
    clearError,
  };
};
