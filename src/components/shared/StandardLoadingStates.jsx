import React from "react";
import PropTypes from "prop-types";
import { LoadingSpinner } from "./LoadingStates";

export function SkeletonList({ count = 6 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="h-20 rounded-lg bg-gray-100 animate-pulse"
        />
      ))}
    </div>
  );
}
SkeletonList.propTypes = { count: PropTypes.number };

export function PageLoading({ label = "Loading…" }) {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <LoadingSpinner message={label} />
    </div>
  );
}
PageLoading.propTypes = { label: PropTypes.string };
