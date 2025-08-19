import React from 'react';

function Skeleton({ className, ...props }) {
  const finalClassName = ["animate-pulse rounded-md bg-gray-200/80", className].filter(Boolean).join(' ');
  
  return (
    <div
      className={finalClassName}
      {...props}
    />
  );
}

export { Skeleton };