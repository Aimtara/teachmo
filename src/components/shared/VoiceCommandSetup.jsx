import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Mic, 
  Smartphone, 
  Chrome, 
  Info, 
  ExternalLink, 
  Copy, 
  CheckCircle,
  Shield
} from 'lucide-react';

const ALEXA_COMMANDS = [
  {
    phrase: "Alexa, ask Teachmo what activities I have today",
    action: "Get today's scheduled activities",
    category: "Planning"
  },
  {
    phrase: "Alexa, ask Teachmo for a parenting tip",
    action: "Receive a personalized parenting tip",
    category: "Learning"
  },
  {
    phrase: "Alexa, ask Teachmo about my child's progress",
    action: "Get progress summary for your children",
    category: "Tracking"
  },
  {
    phrase: "Alexa, ask Teachmo to find family events",
    action: "Discover local family-friendly events",
    category: "Discovery"
  }
];

const SIRI_SHORTCUTS = [
  {
    phrase: "Hey Siri, Teachmo activities",
    action: "Open Teachmo and show today's activities",
    category: "Planning"
  },
  {
    phrase: "Hey Siri, parenting help",
    action: "Get a quick parenting tip from Teachmo",
    category: "Learning"
  },
  {
    phrase: "Hey Siri, log activity",
    action: "Quickly log a completed activity",
    category: "Tracking"
  },
  {
    phrase: "Hey Siri, family time",
    action: "Find nearby family events",
    category: "Discovery"
  }
];

const GOOGLE_ACTIONS = [
  {
    phrase: "Hey Google, talk to Teachmo",
    action: "Start conversation with Teachmo assistant",
    category: "General"
  },
  {
    phrase: "Hey Google, ask Teachmo for today's plan",
    action: "Get your daily activity recommendations",
    category: "Planning"
  },
  {
    phrase: "Hey Google, ask Teachmo about my streak",
    action: "Check your current activity streak",
    category: "Tracking"
  }
];

function CommandCard({ commands, icon: Icon, title, description, setupInstructions }) {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100">
            <Icon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {commands.map((command, index) => (
            <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {command.category}
                    </Badge>
                  </div>
                  <p className="font-medium text-gray-900 mb-1">
                    "{command.phrase}"
                  </p>
                  <p className="text-sm text-gray-600">
                    {command.action}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(command.phrase, index)}
                  className="shrink-0"
                >
                  {copiedIndex === index ? (
                    <><CheckCircle className="w-4 h-4 mr-1" /> Copied</>
                  ) : (
                    <><Copy className="w-4 h-4 mr-1" /> Copy</>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Setup:</strong> {setupInstructions}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VoiceCommandSetup() {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if voice features are supported
    setIsSupported('speechSynthesis' in window && 'SpeechRecognition' in window);
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Voice Assistant Setup</h1>
        <p className="text-gray-600">
          Connect Teachmo with your favorite voice assistants for hands-free parenting support
        </p>
      </div>

      <Tabs defaultValue="alexa" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="alexa">Amazon Alexa</TabsTrigger>
          <TabsTrigger value="siri">Apple Siri</TabsTrigger>
          <TabsTrigger value="google">Google Assistant</TabsTrigger>
        </TabsList>
        
        <TabsContent value="alexa" className="mt-6">
          <CommandCard
            commands={ALEXA_COMMANDS}
            icon={Mic}
            title="Amazon Alexa Integration"
            description="Use these voice commands with your Alexa device"
            setupInstructions="Enable the Teachmo skill in your Alexa app, then use these voice commands"
          />
          
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900">Setup Instructions</h4>
                <ol className="text-sm text-amber-800 mt-1 space-y-1 list-decimal list-inside">
                  <li>Open the Alexa app on your phone</li>
                  <li>Go to Skills &amp; Games</li>
                  <li>Search for "Teachmo" and enable the skill</li>
                  <li>Link your Teachmo account when prompted</li>
                  <li>Start using the voice commands above</li>
                </ol>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="siri" className="mt-6">
          <CommandCard
            commands={SIRI_SHORTCUTS}
            icon={Smartphone}
            title="Apple Siri Shortcuts"
            description="Create custom Siri shortcuts for quick access to Teachmo features"
            setupInstructions="Set up each shortcut in your iPhone Settings &gt; Siri &amp; Search &gt; Add to Siri"
          />
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">How to Set Up Siri Shortcuts</h4>
                <ol className="text-sm text-blue-800 mt-1 space-y-1 list-decimal list-inside">
                  <li>Go to Settings &gt; Siri &amp; Search on your iPhone</li>
                  <li>Tap "Add to Siri" or "All Shortcuts"</li>
                  <li>Record the phrases shown above</li>
                  <li>Choose to open Teachmo with specific actions</li>
                </ol>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="google" className="mt-6">
          <CommandCard
            commands={GOOGLE_ACTIONS}
            icon={Chrome}
            title="Google Assistant Actions"
            description="Voice commands for Google Assistant and Google Home devices"
            setupInstructions="These commands work automatically with Google Assistant - no setup required"
          />
          
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900">Google Assistant Ready</h4>
                <p className="text-sm text-green-800 mt-1">
                  These commands work with any Google Assistant device. Simply say the phrases above to get started.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Privacy Note:</strong> Voice commands are processed securely and only used to provide the requested Teachmo features. Your conversations are not stored or used for other purposes.
        </AlertDescription>
      </Alert>
    </div>
  );
}