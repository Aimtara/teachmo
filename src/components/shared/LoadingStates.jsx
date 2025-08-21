
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Loader2, Wifi, WifiOff, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Animated loading spinner with context
export function LoadingSpinner({ size = 'default', text = 'Loading...', className = '' }) {
  const sizeMap = {
    sm: 'w-4 h-4',
    default: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Loader2 className={`${sizeMap[size]} animate-spin text-blue-600`} />
      {text && <span className="text-sm text-gray-600 animate-pulse">{text}</span>}
    </div>
  );
}

// Inline loading state for buttons and small components
export function InlineLoader({ text = 'Loading...', className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex space-x-1">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-blue-600 rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ 
              duration: 1.2, 
              repeat: Infinity, 
              delay: i * 0.2 
            }}
          />
        ))}
      </div>
      <span className="text-sm text-gray-600">{text}</span>
    </div>
  );
}

export const PageLoadingSkeleton = ({ variant = 'dashboard' }) => {
  if (variant === 'dashboard') {
    return (
      <div className="min-h-screen p-4 md:p-6 space-y-6 animate-pulse">
        <div className="max-w-7xl mx-auto">
          {/* Header skeleton */}
          <div className="mb-6 space-y-2">
            <Skeleton className="h-10 w-80" />
            <Skeleton className="h-4 w-32" />
          </div>
          
          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main column */}
            <div className="lg:col-span-8 space-y-6">
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
            
            {/* Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default page skeleton
  return (
    <div className="space-y-6 p-6 animate-pulse">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
};

// List loading skeleton
export function ListLoadingSkeleton({ items = 5, showAvatar = false, showActions = true }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }, (_, i) => (
        <Card key={i} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {showAvatar && <Skeleton className="w-10 h-10 rounded-full" />}
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              {showActions && (
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Form loading skeleton
export function FormLoadingSkeleton({ fields = 4 }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <div className="flex gap-2 pt-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

// Error state component with retry functionality
export function ErrorState({ 
  error, 
  onRetry, 
  title = 'Something went wrong', 
  showDetails = false,
  className = '' 
}) {
  const getErrorIcon = () => {
    if (error?.code === 'NETWORK_ERROR') {
      return <WifiOff className="w-12 h-12 text-red-500" />;
    }
    return <AlertCircle className="w-12 h-12 text-red-500" />;
  };

  const getErrorDescription = () => {
    if (error?.message) {
      return error.message;
    }
    return 'An unexpected error occurred. Please try again.';
  };

  return (
    <div className={`text-center space-y-4 p-8 ${className}`}>
      <div className="flex justify-center">
        {getErrorIcon()}
      </div>
      
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          {getErrorDescription()}
        </p>
      </div>

      {showDetails && error?.original && (
        <Alert className="max-w-md mx-auto text-left">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs font-mono">
            {error.original.toString()}
          </AlertDescription>
        </Alert>
      )}

      {onRetry && (
        <div className="flex justify-center gap-2">
          <Button onClick={onRetry} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}

// Empty state component
export function EmptyState({ 
  title = 'No items found', 
  description = 'Get started by adding your first item.',
  action = null,
  icon: Icon = null,
  className = '' 
}) {
  return (
    <div className={`text-center space-y-4 p-8 ${className}`}>
      {Icon && (
        <div className="flex justify-center">
          <Icon className="w-12 h-12 text-gray-400" />
        </div>
      )}
      
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-gray-600 max-w-md mx-auto">{description}</p>
      </div>

      {action}
    </div>
  );
}

// Network status indicator
export function NetworkStatus({ isOnline = navigator.onLine }) {
  if (isOnline) return null;

  return (
    <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800 mb-4">
      <WifiOff className="h-4 w-4" />
      <AlertDescription>
        You're currently offline. Some features may not work properly.
      </AlertDescription>
    </Alert>
  );
}

// Progressive loading component for lazy-loaded content
export function ProgressiveLoader({ 
  isLoading, 
  error, 
  onRetry, 
  fallback: Fallback = PageLoadingSkeleton,
  children 
}) {
  if (isLoading) {
    return <Fallback />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  return <>{children}</>;
}

export default {
  LoadingSpinner,
  InlineLoader,
  PageLoadingSkeleton,
  ListLoadingSkeleton,
  FormLoadingSkeleton,
  ErrorState,
  EmptyState,
  NetworkStatus,
  ProgressiveLoader
};
