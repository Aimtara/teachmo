import { LoadingSpinner } from './LoadingStates';

type SkeletonListProps = {
  count?: number;
};

export function SkeletonList({ count = 6 }: SkeletonListProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="h-20 rounded-lg bg-gray-100 animate-pulse" />
      ))}
    </div>
  );
}

type PageLoadingProps = {
  label?: string;
};

export function PageLoading({ label = 'Loading…' }: PageLoadingProps) {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <LoadingSpinner message={label} />
    </div>
  );
}
