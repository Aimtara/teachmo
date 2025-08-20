import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLiveRegion, useHighContrast, useReducedMotion } from './AccessibilityHelpers';

const AccessibilityContext = createContext({});

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

export const AccessibilityProvider = ({ children }) => {
  const [focusVisible, setFocusVisible] = useState(false);
  const [keyboardUser, setKeyboardUser] = useState(false);
  const { announce } = useLiveRegion();
  const isHighContrast = useHighContrast();
  const prefersReducedMotion = useReducedMotion();

  // Detect if user is navigating with keyboard
  useEffect(() => {
    let hadKeyboardEvent = false;
    
    const keyboardThrottleTimeout = 100;
    let keyboardThrottleTimeoutId;
    
    const markKeyboardUser = () => {
      hadKeyboardEvent = true;
      setKeyboardUser(true);
      setFocusVisible(true);
      
      clearTimeout(keyboardThrottleTimeoutId);
      keyboardThrottleTimeoutId = setTimeout(() => {
        hadKeyboardEvent = false;
      }, keyboardThrottleTimeout);
    };
    
    const markMouseUser = () => {
      if (!hadKeyboardEvent) {
        setKeyboardUser(false);
        setFocusVisible(false);
      }
    };
    
    // Listen for keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ' || e.key.startsWith('Arrow')) {
        markKeyboardUser();
      }
    });
    
    // Listen for mouse usage
    document.addEventListener('mousedown', markMouseUser);
    document.addEventListener('pointerdown', markMouseUser);
    
    return () => {
      clearTimeout(keyboardThrottleTimeoutId);
    };
  }, []);

  // Apply global accessibility classes
  useEffect(() => {
    const body = document.body;
    
    if (keyboardUser) {
      body.classList.add('using-keyboard');
    } else {
      body.classList.remove('using-keyboard');
    }
    
    if (isHighContrast) {
      body.classList.add('high-contrast');
    } else {
      body.classList.remove('high-contrast');
    }
    
    if (prefersReducedMotion) {
      body.classList.add('reduced-motion');
    } else {
      body.classList.remove('reduced-motion');
    }
  }, [keyboardUser, isHighContrast, prefersReducedMotion]);

  // Announce page changes for screen readers
  const announcePageChange = (pageName) => {
    announce(`Navigated to ${pageName}`, 'polite');
  };

  // Announce form errors
  const announceFormError = (message) => {
    announce(`Error: ${message}`, 'assertive');
  };

  // Announce success messages
  const announceSuccess = (message) => {
    announce(`Success: ${message}`, 'polite');
  };

  // General screen reader announcement
  const announceToScreenReader = (message, priority = 'polite') => {
    announce(message, priority);
  };

  const contextValue = {
    focusVisible,
    keyboardUser,
    isHighContrast,
    prefersReducedMotion,
    announcePageChange,
    announceFormError,
    announceSuccess,
    announceToScreenReader
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
};