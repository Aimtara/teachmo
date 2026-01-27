import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "./SmartNotifications";

export default function VoiceInput({ 
  onVoiceInput, 
  placeholder = "Try saying 'Find art activities for my 5 year old'",
  className = "",
  autoStart = false 
}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const { addNotification } = useNotifications();

  useEffect(() => {
    // Check for speech recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      
      const recognition = recognitionRef.current;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
            setConfidence(result[0].confidence);
          } else {
            interimTranscript += result[0].transcript;
          }
        }
        
        setTranscript(finalTranscript + interimTranscript);
        
        if (finalTranscript && onVoiceInput) {
          onVoiceInput(finalTranscript.trim());
          stopListening();
        }
      };

      recognition.onerror = (event) => {
        setError(event.error);
        setIsListening(false);
        
        if (event.error === 'not-allowed') {
          addNotification({
            title: "Microphone Access Denied",
            message: "Please allow microphone access to use voice input.",
            type: "error"
          });
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      if (autoStart) {
        startListening();
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onVoiceInput, autoStart]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript("");
      setError(null);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
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
      <div className={`text-center text-gray-500 text-sm ${className}`}>
        <MicOff className="w-4 h-4 mx-auto mb-1" />
        Voice input not supported in this browser
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Voice Input Button */}
      <div className="flex items-center justify-center gap-3">
        <Button
          variant={isListening ? "default" : "outline"}
          onClick={toggleListening}
          disabled={error === 'not-allowed'}
          className={`gap-2 ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
              : 'hover:bg-gray-50'
          }`}
        >
          {isListening ? (
            <>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Mic className="w-4 h-4" />
              </motion.div>
              Listening...
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              Voice Search
            </>
          )}
        </Button>

        {isListening && (
          <Badge variant="outline" className="animate-pulse">
            🎤 Speak now
          </Badge>
        )}
      </div>

      {/* Live Transcript */}
      <AnimatePresence>
        {(isListening || transcript) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="p-3 bg-gray-50 border-dashed">
              <div className="text-center">
                {transcript ? (
                  <div>
                    <p className="text-sm text-gray-900 font-medium">"{transcript}"</p>
                    {confidence > 0 && (
                      <Badge variant="outline" className="mt-2">
                        {Math.round(confidence * 100)}% confidence
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      <Volume2 className="w-4 h-4" />
                    </motion.div>
                    <span className="text-sm">{placeholder}</span>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      {error && error !== 'not-allowed' && (
        <div className="text-center text-red-600 text-sm">
          <MicOff className="w-4 h-4 mx-auto mb-1" />
          Voice input error: {error}
        </div>
      )}

      {/* Voice Commands Help */}
      {!isListening && !transcript && (
        <div className="text-center text-xs text-gray-400">
          <p>Try: "Find creative activities" • "Schedule playtime" • "Ask about bedtime"</p>
        </div>
      )}
    </div>
  );
}

export { VoiceInput };
