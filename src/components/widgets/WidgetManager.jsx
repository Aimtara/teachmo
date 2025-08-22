import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';
import TeachmoLiveWidget from './TeachmoLiveWidget';

// Widget registry for easy extension
const AVAILABLE_WIDGETS = {
  teachmoLive: {
    id: 'teachmoLive',
    name: 'Teachmo Live',
    icon: Wand2,
    description: 'Get instant parenting advice and support',
    component: TeachmoLiveWidget,
    defaultSize: 'compact'
  }
};

export default function WidgetManager() {
  const [activeWidgets, setActiveWidgets] = useState([]);
  const [widgetSettings, setWidgetSettings] = useState({});

  useEffect(() => {
    // Load widget state from localStorage
    const savedWidgets = localStorage.getItem('teachmo_active_widgets');
    const savedSettings = localStorage.getItem('teachmo_widget_settings');
    
    if (savedWidgets) {
      setActiveWidgets(JSON.parse(savedWidgets));
    }
    
    if (savedSettings) {
      setWidgetSettings(JSON.parse(savedSettings));
    }
  }, []);

  useEffect(() => {
    // Save widget state to localStorage
    localStorage.setItem('teachmo_active_widgets', JSON.stringify(activeWidgets));
    localStorage.setItem('teachmo_widget_settings', JSON.stringify(widgetSettings));
  }, [activeWidgets, widgetSettings]);

  const openWidget = (widgetId) => {
    if (!activeWidgets.includes(widgetId)) {
      setActiveWidgets(prev => [...prev, widgetId]);
    }
  };

  return (
    <>
      {/* Widget Launcher - smaller floating button */}
      <div className="fixed bottom-4 right-4 z-40">
        <Button
          onClick={() => openWidget('teachmoLive')}
          className="rounded-full w-12 h-12 shadow-lg hover:shadow-xl transition-shadow"
          style={{background: 'linear-gradient(135deg, var(--teachmo-sage), var(--teachmo-sage-light))'}}
          title="Open Teachmo Live"
        >
          <Wand2 className="w-5 h-5" />
        </Button>
      </div>

      {/* Active Widgets */}
      {activeWidgets.map(widgetId => {
        const widgetConfig = AVAILABLE_WIDGETS[widgetId];
        if (!widgetConfig) return null;

        const WidgetComponent = widgetConfig.component;
        const settings = widgetSettings[widgetId] || {};

        return (
          <WidgetComponent
            key={widgetId}
            isVisible={true}
            size={settings.size || widgetConfig.defaultSize}
            {...settings}
          />
        );
      })}
    </>
  );
}