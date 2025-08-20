import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

export const useErrorHandler = () => {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleError = (error, customMessage) => {
    console.error('Error occurred:', error);
    setError(error);

    let errorMessage = customMessage || 'Something went wrong. Please try again.';
    
    // Handle specific error types
    if (error?.message?.includes('Network') || error?.message?.includes('Failed to fetch')) {
      errorMessage = 'Network error. Please check your connection and try again.';
    } else if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
      errorMessage = 'Your session has expired. Please sign in again.';
    } else if (error?.message?.includes('403') || error?.message?.includes('Forbidden')) {
      errorMessage = 'You don\'t have permission to perform this action.';
    } else if (error?.message?.includes('500')) {
      errorMessage = 'Server error. We\'re working to fix this issue.';
    }

    toast({
      variant: 'destructive',
      title: 'Error',
      description: errorMessage,
    });
  };

  const executeAsync = async (asyncFunction, loadingMessage) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await asyncFunction();
      return result;
    } catch (error) {
      handleError(error);
      throw error;
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
    clearError
  };
};