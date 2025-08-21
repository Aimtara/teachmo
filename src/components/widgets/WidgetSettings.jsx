import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Settings, Volume2, Palette, Monitor } from 'lucide-react';

export default function WidgetSettings({ widget, settings, onSettingsChange }) {
  const updateSetting = (key, value) => {
    onSettingsChange(widget.id, { [key]: value });
  };

  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5" />
          Widget Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Size Setting */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Widget Size
          </Label>
          <Select 
            value={settings.size || 'default'} 
            onValueChange={(value) => updateSetting('size', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">Compact</SelectItem>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sound Setting */}
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Sound Enabled
          </Label>
          <Switch
            checked={settings.soundEnabled !== false}
            onCheckedChange={(checked) => updateSetting('soundEnabled', checked)}
          />
        </div>

        {/* Auto-minimize Setting */}
        <div className="flex items-center justify-between">
          <Label>Auto-minimize when idle</Label>
          <Switch
            checked={settings.autoMinimize || false}
            onCheckedChange={(checked) => updateSetting('autoMinimize', checked)}
          />
        </div>

        {/* Theme Setting */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Theme
          </Label>
          <Select 
            value={settings.theme || 'default'} 
            onValueChange={(value) => updateSetting('theme', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="cool">Cool</SelectItem>
              <SelectItem value="minimal">Minimal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}