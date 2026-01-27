import React, { createContext, useContext, useEffect, useState } from 'react';
import { AccessibilityPreference } from '@/api/entities';
import { User } from '@/api/entities';

const AccessibilityContext = createContext();

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

export default function AccessibilityProvider({ children }) {
  const [preferences, setPreferences] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAccessibilityPreferences();
  }, []);

  useEffect(() => {
    if (preferences) {
      applyAccessibilitySettings();
    }
  }, [preferences]);

  const loadAccessibilityPreferences = async () => {
    try {
      const user = await User.me();
      const userPrefs = await AccessibilityPreference.filter({ user_id: user.id });
      
      if (userPrefs.length > 0) {
        setPreferences(userPrefs[0]);
      } else {
        // Create default preferences
        const defaultPrefs = await AccessibilityPreference.create({
          user_id: user.id,
          screen_reader: false,
          high_contrast: false,
          large_text: false,
          reduced_motion: false,
          keyboard_navigation: false,
          voice_commands: false,
          color_blind_support: 'none',
          preferred_language: 'en',
          auto_translate: false,
          focus_indicators: true,
          skip_links: true
        });
        setPreferences(defaultPrefs);
      }
    } catch (error) {
      console.error('Error loading accessibility preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyAccessibilitySettings = () => {
    const root = document.documentElement;
    
    // High contrast mode
    if (preferences.high_contrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Large text
    if (preferences.large_text) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }

    // Reduced motion
    if (preferences.reduced_motion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    // Keyboard navigation focus
    if (preferences.keyboard_navigation) {
      root.classList.add('keyboard-nav');
    } else {
      root.classList.remove('keyboard-nav');
    }

    // Color blind support
    if (preferences.color_blind_support !== 'none') {
      root.classList.add(`color-blind-${preferences.color_blind_support}`);
    } else {
      root.classList.remove('color-blind-deuteranopia', 'color-blind-protanopia', 'color-blind-tritanopia');
    }

    // Enhanced focus indicators
    if (preferences.focus_indicators) {
      root.classList.add('enhanced-focus');
    } else {
      root.classList.remove('enhanced-focus');
    }
  };

  const updatePreferences = async (newPreferences) => {
    try {
      const updated = await AccessibilityPreference.update(preferences.id, newPreferences);
      setPreferences(updated);
      return updated;
    } catch (error) {
      console.error('Error updating accessibility preferences:', error);
      throw error;
    }
  };

  if (isLoading) {
    return <div>Loading accessibility settings...</div>;
  }

  return (
    <AccessibilityContext.Provider value={{
      preferences,
      updatePreferences,
      isLoading
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export { AccessibilityProvider };
