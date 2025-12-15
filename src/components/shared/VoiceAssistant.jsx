import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Settings, 
  MessageSquare,
  Calendar,
  Lightbulb,
  User,
  Heart
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { Activity, Child, CalendarEvent, JournalEntry } from '@/api/entities';
import { invokeLLM } from '@/api/integrations';

const VOICE_COMMANDS = {
  navigation: {
    'go to activities': () => ({ action: 'navigate', target: 'Activities' }),
    'open calendar': () => ({ action: 'navigate', target: 'Calendar' }),
    'show my progress': () => ({ action: 'navigate', target: 'Progress' }),
    'open journal': () => ({ action: 'navigate', target: 'Journal' }),
    'show settings': () => ({ action: 'navigate', target: 'Settings' }),
    'go to messages': () => ({ action: 'navigate', target: 'Messages' }),
    'open library': () => ({ action: 'navigate', target: 'Library' }),
    'find events': () => ({ action: 'navigate', target: 'Discover' }),
  },
  queries: {
    'what activities do I have today': () => ({ action: 'query', type: 'todayActivities' }),
    'how many points do I have': () => ({ action: 'query', type: 'points' }),
    'what\'s my streak': () => ({ action: 'query', type: 'streak' }),
    'tell me about my children': () => ({ action: 'query', type: 'children' }),
    'what\'s my next event': () => ({ action: 'query', type: 'nextEvent' }),
    'give me a parenting tip': () => ({ action: 'query', type: 'tip' }),
  },
  actions: {
    'create new activity': () => ({ action: 'create', type: 'activity' }),
    'schedule activity': () => ({ action: 'create', type: 'event' }),
    'start journal entry': () => ({ action: 'create', type: 'journal' }),
    'complete activity': () => ({ action: 'complete', type: 'activity' }),
  }
};

export default function VoiceAssistant({ user, children }) {
  const [isListening, setIsListening] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [lastCommand, setLastCommand] = useState('');
  const [response, setResponse] = useState('');
  const [recognition, setRecognition] = useState(null);
  const [synthesis, setSynthesis] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState({
    autoSpeak: true,
    language: 'en-US',
    voice: null
  });
  const navigate = useNavigate();

  useEffect(() => {
    initializeVoiceCapabilities();
    setupVoiceCommands();
  }, []);

  const initializeVoiceCapabilities = () => {
    // Check for speech recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const SpeechSynthesis = window.speechSynthesis;
    
    if (SpeechRecognition && SpeechSynthesis) {
      setIsSupported(true);
      
      // Setup speech recognition
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = voiceSettings.language;
      
      recognitionInstance.onresult = handleVoiceCommand;
      recognitionInstance.onerror = handleVoiceError;
      recognitionInstance.onend = () => setIsListening(false);
      
      setRecognition(recognitionInstance);
      setSynthesis(SpeechSynthesis);
      
      // Load available voices
      SpeechSynthesis.onvoiceschanged = () => {
        const voices = SpeechSynthesis.getVoices();
        const defaultVoice = voices.find(voice => voice.lang.startsWith('en'));
        setVoiceSettings(prev => ({ ...prev, voice: defaultVoice }));
      };
    }
  };

  const setupVoiceCommands = () => {
    // Register with browser voice assistant APIs if available
    if ('speechSynthesis' in window) {
      // Setup for web speech API
      registerWebSpeechCommands();
    }
    
    // Setup for Alexa Skills Kit (would require server-side integration)
    setupAlexaIntegration();
    
    // Setup for Siri Shortcuts (iOS only)
    setupSiriIntegration();
  };

  const registerWebSpeechCommands = () => {
    // This would typically involve registering with browser's voice command system
    console.log('Registering web speech commands...');
  };

  const setupAlexaIntegration = () => {
    // This would require an Alexa skill backend
    // For now, we'll create the voice command structure
    const alexaCommands = {
      intents: [
        {
          intent: "GetTodayActivities",
          samples: [
            "ask teachmo what activities I have today",
            "ask teachmo about my schedule",
            "ask teachmo what's planned for today"
          ]
        },
        {
          intent: "GetProgress",
          samples: [
            "ask teachmo about my progress",
            "ask teachmo how I'm doing",
            "ask teachmo about my points"
          ]
        },
        {
          intent: "CreateActivity",
          samples: [
            "ask teachmo to create an activity",
            "ask teachmo to suggest something to do",
            "ask teachmo for activity ideas"
          ]
        }
      ]
    };
    
    console.log('Alexa integration ready:', alexaCommands);
  };

  const setupSiriIntegration = () => {
    // iOS Siri Shortcuts would be configured through app settings
    // We can provide the shortcut phrases for users to set up
    const siriShortcuts = [
      {
        phrase: "Open Teachmo Activities",
        action: "navigate",
        target: "Activities"
      },
      {
        phrase: "Check my parenting progress",
        action: "query",
        type: "progress"
      },
      {
        phrase: "Start a journal entry",
        action: "create",
        type: "journal"
      }
    ];
    
    console.log('Siri shortcuts available:', siriShortcuts);
  };

  const handleVoiceCommand = async (event) => {
    const command = event.results[0][0].transcript.toLowerCase().trim();
    setLastCommand(command);
    
    // Find matching command
    let matchedCommand = null;
    let commandType = null;
    
    for (const [type, commands] of Object.entries(VOICE_COMMANDS)) {
      for (const [phrase, handler] of Object.entries(commands)) {
        if (command.includes(phrase) || phrase.includes(command)) {
          matchedCommand = handler();
          commandType = type;
          break;
        }
      }
      if (matchedCommand) break;
    }
    
    if (matchedCommand) {
      await executeCommand(matchedCommand, command);
    } else {
      // Use AI to interpret unclear commands
      await handleNaturalLanguageCommand(command);
    }
  };

  const executeCommand = async (command, originalText) => {
    let responseText = '';
    
    try {
      switch (command.action) {
        case 'navigate':
          navigate(createPageUrl(command.target));
          responseText = `Opening ${command.target}`;
          break;
          
        case 'query':
          responseText = await handleQuery(command.type);
          break;
          
        case 'create':
          responseText = await handleCreate(command.type, originalText);
          break;
          
        case 'complete':
          responseText = await handleComplete(command.type);
          break;
          
        default:
          responseText = "I'm not sure how to help with that.";
      }
    } catch (error) {
      console.error('Error executing voice command:', error);
      responseText = "Sorry, I encountered an error processing that request.";
    }
    
    setResponse(responseText);
    if (voiceSettings.autoSpeak) {
      speak(responseText);
    }
  };

  const handleQuery = async (queryType) => {
    switch (queryType) {
      case 'todayActivities':
        const activities = await Activity.filter({ 
          status: 'planned',
          completion_date: new Date().toISOString().split('T')[0]
        });
        return activities.length > 0 
          ? `You have ${activities.length} activities planned for today: ${activities.map(a => a.title).join(', ')}`
          : "You don't have any activities planned for today.";
          
      case 'points':
        return `You have ${user?.points || 0} points.`;
        
      case 'streak':
        return `Your current login streak is ${user?.login_streak || 0} days.`;
        
      case 'children':
        if (children.length === 0) {
          return "You haven't added any children profiles yet.";
        }
        return `You have ${children.length} ${children.length === 1 ? 'child' : 'children'}: ${children.map(c => `${c.name}, age ${c.age}`).join(', ')}.`;
        
      case 'nextEvent':
        const events = await CalendarEvent.filter({
          start_time: { $gte: new Date().toISOString() }
        }, 'start_time', 1);
        return events.length > 0 
          ? `Your next event is "${events[0].title}" scheduled for ${new Date(events[0].start_time).toLocaleDateString()}.`
          : "You don't have any upcoming events.";
          
      case 'tip':
        return await generateParentingTip();
        
      default:
        return "I'm not sure what information you're looking for.";
    }
  };

  const handleCreate = async (createType, originalText) => {
    switch (createType) {
      case 'activity':
        navigate(createPageUrl('Activities'));
        return "I've opened the activities page where you can create a new activity.";
        
      case 'event':
        navigate(createPageUrl('Calendar'));
        return "I've opened your calendar where you can schedule an event.";
        
      case 'journal':
        navigate(createPageUrl('Journal'));
        return "I've opened your journal where you can start writing.";
        
      default:
        return "I'm not sure what you want to create.";
    }
  };

  const handleComplete = async (completeType) => {
    switch (completeType) {
      case 'activity':
        const plannedActivities = await Activity.filter({ status: 'planned' });
        if (plannedActivities.length === 0) {
          return "You don't have any activities to complete.";
        }
        // For simplicity, we'll just mention the process
        return `You have ${plannedActivities.length} planned activities. Please specify which one you'd like to mark as complete, or use the app to select it.`;
        
      default:
        return "I'm not sure what you want to complete.";
    }
  };

  const handleNaturalLanguageCommand = async (command) => {
    try {
      const response = await invokeLLM({
        prompt: `You are Teachmo's voice assistant. A parent said: "${command}". 

        Available actions:
        - Navigate to: Activities, Calendar, Progress, Journal, Settings, Messages, Library, Discover
        - Query: today's activities, points, streak, children info, next event, parenting tip
        - Create: activity, event, journal entry
        - Complete: activity

        User context:
        - Has ${children.length} children
        - Current points: ${user?.points || 0}
        - Login streak: ${user?.login_streak || 0} days

        Respond with a helpful action or information. If you can't determine the intent, ask for clarification. Keep responses under 50 words and conversational.`,
      });

      setResponse(response);
      if (voiceSettings.autoSpeak) {
        speak(response);
      }
    } catch (error) {
      const fallbackResponse = "I'm not sure what you meant. You can ask me about your activities, progress, children, or ask me to open different sections of the app.";
      setResponse(fallbackResponse);
      if (voiceSettings.autoSpeak) {
        speak(fallbackResponse);
      }
    }
  };

  const generateParentingTip = async () => {
    try {
      const childContext = children.length > 0 
        ? `for a parent with children aged ${children.map(c => c.age).join(', ')}`
        : 'for parents';
        
      const tip = await invokeLLM({
        prompt: `Generate a brief, practical parenting tip ${childContext}. Keep it under 30 words and actionable.`
      });
      
      return `Here's a parenting tip: ${tip}`;
    } catch (error) {
      return "Try spending 5 minutes of focused, device-free time with your child today. Even small moments of connection make a big difference.";
    }
  };

  const speak = (text) => {
    if (synthesis && voiceSettings.voice) {
      // Cancel any ongoing speech
      synthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voiceSettings.voice;
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      synthesis.speak(utterance);
    }
  };

  const handleVoiceError = (event) => {
    console.error('Voice recognition error:', event.error);
    setIsListening(false);
    
    let errorMessage = "Sorry, I couldn't understand that.";
    switch (event.error) {
      case 'no-speech':
        errorMessage = "I didn't hear anything. Please try again.";
        break;
      case 'network':
        errorMessage = "Network error. Please check your connection.";
        break;
      case 'not-allowed':
        errorMessage = "Microphone access is required for voice commands.";
        break;
    }
    
    setResponse(errorMessage);
    if (voiceSettings.autoSpeak) {
      speak(errorMessage);
    }
  };

  const startListening = () => {
    if (recognition && isEnabled) {
      setIsListening(true);
      setResponse('');
      recognition.start();
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <Alert className="mb-4">
        <MessageSquare className="h-4 w-4" />
        <AlertDescription>
          Voice commands are not supported in your browser. Try using Chrome or Safari for the best experience.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-0 shadow-sm bg-white/90 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" style={{color: 'var(--teachmo-sage)'}} />
            Voice Assistant
          </CardTitle>
          <div className="flex items-center gap-2">
            <Switch 
              checked={isEnabled} 
              onCheckedChange={setIsEnabled}
              id="voice-enabled" 
            />
            <Label htmlFor="voice-enabled" className="text-sm">Enabled</Label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <Button
            onClick={toggleListening}
            disabled={!isEnabled}
            size="lg"
            className={`w-16 h-16 rounded-full ${
              isListening 
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg animate-pulse' 
                : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white'
            }`}
          >
            {isListening ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </Button>
          <p className="text-sm text-gray-600 mt-2">
            {isListening ? 'Listening...' : 'Tap to speak'}
          </p>
        </div>

        {lastCommand && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-900">You said:</p>
            <p className="text-sm text-blue-800">"{lastCommand}"</p>
          </div>
        )}

        {response && (
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-green-900">Teachmo:</p>
                <p className="text-sm text-green-800">{response}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => speak(response)}
                className="text-green-600 hover:text-green-700"
              >
                <Volume2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm font-medium">Voice Settings</Label>
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-speak" className="text-sm">Auto-speak responses</Label>
            <Switch 
              id="auto-speak"
              checked={voiceSettings.autoSpeak} 
              onCheckedChange={(checked) => setVoiceSettings(prev => ({ ...prev, autoSpeak: checked }))}
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="text-xs font-medium text-gray-700 mb-2">Try saying:</p>
          <div className="space-y-1">
            {[
              "What activities do I have today?",
              "How many points do I have?",
              "Go to activities",
              "Give me a parenting tip",
              "Tell me about my children"
            ].map((example, index) => (
              <Badge key={index} variant="outline" className="text-xs mr-2 mb-1">
                "{example}"
              </Badge>
            ))}
          </div>
        </div>

        <Alert className="bg-purple-50 border-purple-200">
          <Heart className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-purple-800 text-sm">
            <strong>Pro tip:</strong> You can also use voice commands with Alexa ("Alexa, ask Teachmo...") or set up Siri Shortcuts for hands-free access.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}