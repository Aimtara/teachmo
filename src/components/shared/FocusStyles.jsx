import React from 'react';

export const FocusStylesProvider = ({ children }) => {
  React.useEffect(() => {
    // Add global focus styles
    const style = document.createElement('style');
    style.textContent = `
      /* Enhanced focus styles */
      .using-keyboard *:focus {
        outline: 2px solid #3b82f6 !important;
        outline-offset: 2px !important;
        border-radius: 4px;
      }

      /* Specific focus styles for common elements */
      .using-keyboard button:focus,
      .using-keyboard a:focus,
      .using-keyboard input:focus,
      .using-keyboard select:focus,
      .using-keyboard textarea:focus {
        outline: 3px solid #3b82f6 !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
      }

      /* High contrast mode adjustments */
      @media (prefers-contrast: high) {
        .using-keyboard *:focus {
          outline: 3px solid #000 !important;
          background-color: #ffff00 !important;
          color: #000 !important;
        }
      }

      /* Reduced motion adjustments */
      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }

      /* Screen reader only class */
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      .focus\:not-sr-only:focus {
        position: static;
        width: auto;
        height: auto;
        padding: inherit;
        margin: inherit;
        overflow: visible;
        clip: auto;
        white-space: normal;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return <>{children}</>;
};