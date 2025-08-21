import React, { useState, useEffect } from 'react';
import { useApi } from '@/components/hooks/useApi';
import { AccessibilityPreference } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Sun, Moon, Contrast, Text, CircleDot } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function AccessibilityControls({ userId }) {
    const [prefs, setPrefs] = useState(null);
    const api = useApi({ context: 'Accessibility Settings', showToastOnSuccess: true });
    const { toast } = useToast();

    useEffect(() => {
        const loadPrefs = async () => {
            const results = await AccessibilityPreference.filter({ user_id: userId });
            if (results.length > 0) {
                setPrefs(results[0]);
            } else {
                // Create default preferences if none exist
                const defaultPrefs = await AccessibilityPreference.create({ user_id: userId });
                setPrefs(defaultPrefs);
            }
        };
        if (userId) loadPrefs();
    }, [userId]);

    useEffect(() => {
        if (prefs) {
            // Apply styles to the root element
            const root = document.documentElement;
            root.classList.toggle('large-text', prefs.large_text);
            root.classList.toggle('high-contrast', prefs.high_contrast);
            root.dataset.colorBlind = prefs.color_blind_support || 'none';
        }
    }, [prefs]);

    const handleUpdate = async (key, value) => {
        const newPrefs = { ...prefs, [key]: value };
        setPrefs(newPrefs);

        await api.execute(
            () => AccessibilityPreference.update(prefs.id, { [key]: value }),
            {
                key: `update_${key}`,
                successMessage: "Accessibility setting updated."
            }
        );
    };

    if (!prefs) {
        return <div>Loading accessibility settings...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Label htmlFor="large-text" className="font-medium">Large Text</Label>
                <Switch id="large-text" checked={prefs.large_text} onCheckedChange={(val) => handleUpdate('large_text', val)} />
            </div>
            <div className="flex items-center justify-between">
                <Label htmlFor="high-contrast" className="font-medium">High Contrast</Label>
                <Switch id="high-contrast" checked={prefs.high_contrast} onCheckedChange={(val) => handleUpdate('high_contrast', val)} />
            </div>
            <div>
                <Label htmlFor="color-blind-mode" className="font-medium">Color Blind Mode</Label>
                <Select value={prefs.color_blind_support} onValueChange={(val) => handleUpdate('color_blind_support', val)}>
                    <SelectTrigger id="color-blind-mode">
                        <SelectValue placeholder="Select a mode" />
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
    );
}