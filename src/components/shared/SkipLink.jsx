import React from 'react';

export const SkipLink = ({ href = '#main-content', children = 'Skip to main content' }) => {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded focus:shadow-lg focus:no-underline"
      onFocus={(e) => {
        // Ensure the skip link is visible when focused
        e.target.classList.remove('sr-only');
      }}
      onBlur={(e) => {
        // Hide the skip link when not focused
        e.target.classList.add('sr-only');
      }}
    >
      {children}
    </a>
  );
};