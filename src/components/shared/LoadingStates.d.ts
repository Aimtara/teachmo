import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'default' | 'lg' | 'xl';
  text?: string;
  message?: string;
  className?: string;
}

export declare function LoadingSpinner(props: LoadingSpinnerProps): JSX.Element;

export interface InlineLoaderProps {
  text?: string;
  className?: string;
}

export declare function InlineLoader(props: InlineLoaderProps): JSX.Element;

export interface PageLoadingSkeletonProps {
  variant?: string;
}

export declare const PageLoadingSkeleton: React.FC<PageLoadingSkeletonProps>;

export interface ListLoadingSkeletonProps {
  items?: number;
  showAvatar?: boolean;
  showActions?: boolean;
}

export declare function ListLoadingSkeleton(props: ListLoadingSkeletonProps): JSX.Element;

export interface FormLoadingSkeletonProps {
  fields?: number;
}

export declare function FormLoadingSkeleton(props: FormLoadingSkeletonProps): JSX.Element;

export interface ErrorStateProps {
  [key: string]: unknown;
}

export declare function ErrorState(props: ErrorStateProps): JSX.Element;

export interface EmptyStateProps {
  [key: string]: unknown;
}

export declare function EmptyState(props: EmptyStateProps): JSX.Element;

export interface NetworkStatusProps {
  isOnline?: boolean;
}

export declare function NetworkStatus(props: NetworkStatusProps): JSX.Element;

export interface ProgressiveLoaderProps {
  [key: string]: unknown;
}

export declare function ProgressiveLoader(props: ProgressiveLoaderProps): JSX.Element;

declare const _default: {
  LoadingSpinner: typeof LoadingSpinner;
  InlineLoader: typeof InlineLoader;
  PageLoadingSkeleton: typeof PageLoadingSkeleton;
  ListLoadingSkeleton: typeof ListLoadingSkeleton;
  FormLoadingSkeleton: typeof FormLoadingSkeleton;
  ErrorState: typeof ErrorState;
  EmptyState: typeof EmptyState;
  NetworkStatus: typeof NetworkStatus;
  ProgressiveLoader: typeof ProgressiveLoader;
};

export default _default;
