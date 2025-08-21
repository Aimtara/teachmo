import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { 
  Eye, 
  Type, 
  Contrast, 
  Volume2, 
  Keyboard, 
  MousePointer,
  Palette,
  Settings
} from 'lucide-react';

/**
 * @typedef {Object} AccessibilitySettings
 * @property {boolean} highContrast
 * @property {boolean} largeText
 * @property {boolean} reducedMotion
 * @property {boolean} screenReader
 * @property {boolean} keyboardNavigation
 * @property {boolean} focusIndicators
 * @property {'none' | 'deuteranopia' | 'protanopia' | 'tritanopia'} colorBlindSupport
 * @property {number} textSize
 * @property {boolean} voiceEnabled
 */

const useAccessibilitySettings = () => {
  const [settings, setSettings] = useState(() => {
    if (typeof window === 'undefined') {
      return {
        highContrast: false,
        largeText: false,
        reducedMotion: false,
        screenReader: false,
        keyboardNavigation: false,
        focusIndicators: true,
        colorBlindSupport: 'none',
        textSize: 100,
        voiceEnabled: false
      };
    }

    // Load from localStorage or detect system preferences
    const stored = localStorage.getItem('teachmo-accessibility');
    const defaultSettings = {
      highContrast: window.matchMedia('(prefers-contrast: high)').matches,
      largeText: false,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      screenReader: false, // Would need more sophisticated detection
      keyboardNavigation: false,
      focusIndicators: true,
      colorBlindSupport: 'none',
      textSize: 100,
      voiceEnabled: false
    };

    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  });

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('teachmo-accessibility', JSON.stringify(newSettings));
    }
  };

  return { settings, updateSetting };
};

const AccessibilityPanel = ({ isOpen, onClose }) => {
  const { settings, updateSetting } = useAccessibilitySettings();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Accessibility Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Visual Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Contrast className="w-5 h-5" />
              Visual
            </h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="high-contrast">High Contrast Mode</Label>
              <Switch
                id="high-contrast"
                checked={settings.highContrast}
                onCheckedChange={(checked) => updateSetting('highContrast', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="large-text">Large Text</Label>
              <Switch
                id="large-text"
                checked={settings.largeText}
                onCheckedChange={(checked) => updateSetting('largeText', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label>Text Size: {settings.textSize}%</Label>
              <Slider
                value={[settings.textSize]}
                onValueChange={([value]) => updateSetting('textSize', value)}
                min={75}
                max={150}
                step={5}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="colorblind-support">Color Blind Support</Label>
              <Select
                value={settings.colorBlindSupport}
                onValueChange={(value) => updateSetting('colorBlindSupport', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="deuteranopia">Deuteranopia (Red-Green)</SelectItem>
                  <SelectItem value="protanopia">Protanopia (Red-Green)</SelectItem>
                  <SelectItem value="tritanopia">Tritanopia (Blue-Yellow)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Navigation Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Keyboard className="w-5 h-5" />
              Navigation
            </h3>

            <div className="flex items-center justify-between">
              <Label htmlFor="keyboard-nav">Enhanced Keyboard Navigation</Label>
              <Switch
                id="keyboard-nav"
                checked={settings.keyboardNavigation}
                onCheckedChange={(checked) => updateSetting('keyboardNavigation', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="focus-indicators">Enhanced Focus Indicators</Label>
              <Switch
                id="focus-indicators"
                checked={settings.focusIndicators}
                onCheckedChange={(checked) => updateSetting('focusIndicators', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="reduced-motion">Reduced Motion</Label>
              <Switch
                id="reduced-motion"
                checked={settings.reducedMotion}
                onCheckedChange={(checked) => updateSetting('reducedMotion', checked)}
              />
            </div>
          </div>

          {/* Screen Reader Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Volume2 className="w-5 h-5" />
              Screen Reader
            </h3>

            <div className="flex items-center justify-between">
              <Label htmlFor="screen-reader">Screen Reader Optimizations</Label>
              <Switch
                id="screen-reader"
                checked={settings.screenReader}
                onCheckedChange={(checked) => updateSetting('screenReader', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="voice-enabled">Voice Commands (Beta)</Label>
              <Switch
                id="voice-enabled"
                checked={settings.voiceEnabled}
                onCheckedChange={(checked) => updateSetting('voiceEnabled', checked)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => {
              // Reset to defaults
              const defaults = {
                highContrast: false,
                largeText: false,
                reducedMotion: false,
                screenReader: false,
                keyboardNavigation: false,
                focusIndicators: true,
                colorBlindSupport: 'none',
                textSize: 100,
                voiceEnabled: false
              };
              Object.entries(defaults).forEach(([key, value]) => {
                updateSetting(key, value);
              });
            }}>
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const AccessibilityEnhancements = () => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const { settings } = useAccessibilitySettings();

  useEffect(() => {
    // Apply accessibility settings to the document
    const root = document.documentElement;

    // High contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Large text
    if (settings.largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }

    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    // Enhanced keyboard navigation
    if (settings.keyboardNavigation) {
      root.classList.add('enhanced-keyboard');
    } else {
      root.classList.remove('enhanced-keyboard');
    }

    // Color blind support
    root.setAttribute('data-color-blind', settings.colorBlindSupport);

    // Text size
    root.style.fontSize = `${settings.textSize}%`;

    // Screen reader optimizations
    if (settings.screenReader) {
      root.classList.add('screen-reader-optimized');
    } else {
      root.classList.remove('screen-reader-optimized');
    }

  }, [settings]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsPanelOpen(true)}
        className="fixed bottom-4 right-4 z-40 bg-white shadow-lg border"
        aria-label="Open accessibility settings"
      >
        <Settings className="w-5 h-5" />
      </Button>

      <AccessibilityPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </>
  );
};

export { useAccessibilitySettings };