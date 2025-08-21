import React from 'react';
import { createContext, useContext } from 'react';

// Screen reader only text component
export const ScreenReaderOnly = ({ children, as: Component = 'span' }) => (
  <Component className="sr-only">
    {children}
  </Component>
);

// Visually hidden but accessible to screen readers
export const VisuallyHidden = ({ children, focusable = false }) => (
  <span 
    className={`absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0 ${
      focusable ? 'focus:not-sr-only focus:w-auto focus:h-auto focus:p-2 focus:m-0 focus:overflow-visible focus:whitespace-normal focus:border focus:border-gray-300 focus:bg-white focus:text-black focus:z-50' : ''
    }`}
    style={{
      clip: 'rect(0, 0, 0, 0)',
      clipPath: 'inset(50%)'
    }}
  >
    {children}
  </span>
);

// Keyboard navigation helpers
export const useKeyboardNavigation = (refs, options = {}) => {
  const { circular = true, autoFocus = false } = options;
  
  React.useEffect(() => {
    if (autoFocus && refs[0]?.current) {
      refs[0].current.focus();
    }
  }, [refs, autoFocus]);

  const handleKeyDown = React.useCallback((event, currentIndex) => {
    const { key } = event;
    
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) {
      return;
    }

    event.preventDefault();
    
    let nextIndex;
    
    switch (key) {
      case 'ArrowDown':
      case 'ArrowRight':
        nextIndex = currentIndex + 1;
        if (nextIndex >= refs.length) {
          nextIndex = circular ? 0 : refs.length - 1;
        }
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        nextIndex = currentIndex - 1;
        if (nextIndex < 0) {
          nextIndex = circular ? refs.length - 1 : 0;
        }
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = refs.length - 1;
        break;
      default:
        return;
    }
    
    refs[nextIndex]?.current?.focus();
  }, [refs, circular]);

  return { handleKeyDown };
};

// Roving tabindex manager
export const useRovingTabIndex = (items, activeIndex = 0) => {
  const [currentIndex, setCurrentIndex] = React.useState(activeIndex);
  
  const getTabIndex = React.useCallback((index) => {
    return index === currentIndex ? 0 : -1;
  }, [currentIndex]);
  
  const setActiveIndex = React.useCallback((index) => {
    setCurrentIndex(index);
  }, []);
  
  return { getTabIndex, setActiveIndex, currentIndex };
};

// Focus management
export const useFocusManagement = () => {
  const focusStack = React.useRef([]);
  
  const pushFocus = React.useCallback((element) => {
    focusStack.current.push(document.activeElement);
    element?.focus();
  }, []);
  
  const popFocus = React.useCallback(() => {
    const previousElement = focusStack.current.pop();
    previousElement?.focus();
  }, []);
  
  const trapFocus = React.useCallback((containerRef) => {
    const container = containerRef.current;
    if (!container) return;
    
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };
    
    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  return { pushFocus, popFocus, trapFocus };
};

// Live region announcements
export const useLiveRegion = () => {
  const liveRegionRef = React.useRef();
  
  React.useEffect(() => {
    // Create live region if it doesn't exist
    if (!liveRegionRef.current) {
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      document.body.appendChild(liveRegion);
      liveRegionRef.current = liveRegion;
    }
    
    return () => {
      if (liveRegionRef.current && document.body.contains(liveRegionRef.current)) {
        document.body.removeChild(liveRegionRef.current);
      }
    };
  }, []);
  
  const announce = React.useCallback((message, priority = 'polite') => {
    if (!liveRegionRef.current) return;
    
    liveRegionRef.current.setAttribute('aria-live', priority);
    liveRegionRef.current.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = '';
      }
    }, 1000);
  }, []);
  
  return { announce };
};

// Accessible dialog/modal
export const useAccessibleDialog = (isOpen) => {
  const dialogRef = React.useRef();
  const previousActiveElement = React.useRef();
  const { trapFocus } = useFocusManagement();
  
  React.useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement;
      
      // Trap focus within the dialog
      const cleanup = trapFocus(dialogRef);
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      return () => {
        cleanup?.();
        document.body.style.overflow = '';
        // Restore focus to the previously focused element
        previousActiveElement.current?.focus();
      };
    }
  }, [isOpen, trapFocus]);
  
  const handleEscape = React.useCallback((event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      // This would typically close the dialog
    }
  }, []);
  
  return { dialogRef, handleEscape };
};

// Accessible form field
export const AccessibleFormField = ({ 
  label, 
  error, 
  hint, 
  required = false, 
  children,
  id,
  ...props 
}) => {
  const fieldId = id || React.useId();
  const errorId = error ? `${fieldId}-error` : undefined;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  
  const describedBy = [errorId, hintId].filter(Boolean).join(' ');
  
  return (
    <div className="space-y-2">
      <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700">
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
      
      {hint && (
        <p id={hintId} className="text-sm text-gray-600">
          {hint}
        </p>
      )}
      
      {React.cloneElement(children, {
        id: fieldId,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? 'true' : undefined,
        'aria-required': required,
        ...props
      })}
      
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

// Accessible button with loading state
export const AccessibleButton = ({ 
  children, 
  isLoading, 
  loadingText = 'Loading...', 
  ...props 
}) => (
  <button
    {...props}
    disabled={isLoading || props.disabled}
    aria-disabled={isLoading || props.disabled}
  >
    {isLoading ? (
      <>
        <ScreenReaderOnly>{loadingText}</ScreenReaderOnly>
        <span aria-hidden="true">{children}</span>
      </>
    ) : (
      children
    )}
  </button>
);

// Accessible skip link
export const SkipLink = ({ href = '#main-content', children = 'Skip to main content' }) => (
  <a
    href={href}
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded focus:shadow-lg focus:no-underline"
  >
    {children}
  </a>
);

// High contrast mode detection
export const useHighContrast = () => {
  const [isHighContrast, setIsHighContrast] = React.useState(false);
  
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    
    setIsHighContrast(mediaQuery.matches);
    
    const handleChange = (e) => setIsHighContrast(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return isHighContrast;
};

// Reduced motion detection
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);
  
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return prefersReducedMotion;
};