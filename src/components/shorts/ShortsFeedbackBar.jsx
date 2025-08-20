import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { shortsTelemetry } from '@/api/functions';

export default function ShortsFeedbackBar({ shortId }) {
  const [state, setState] = useState({ helpful: null, tried: null });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendFeedback = async (updates) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const newState = { ...state, ...updates };
      setState(newState);
      
      await shortsTelemetry({
        endpoint: `feedback`,
        shortId,
        body: newState
      });
    } catch (error) {
      console.error('Error sending feedback:', error);
      // Revert state on error
      setState(state);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={state.helpful === true ? "default" : "outline"}
        size="sm"
        onClick={() => sendFeedback({ helpful: true })}
        disabled={isSubmitting}
        className={state.helpful === true ? "bg-green-600 hover:bg-green-700" : ""}
      >
        👍 Helpful
      </Button>
      
      <Button
        variant={state.helpful === false ? "destructive" : "outline"}
        size="sm"
        onClick={() => sendFeedback({ helpful: false })}
        disabled={isSubmitting}
      >
        👎 Not really
      </Button>
      
      <Button
        variant={state.tried === true ? "default" : "outline"}
        size="sm"
        onClick={() => sendFeedback({ tried: true })}
        disabled={isSubmitting}
        className={state.tried === true ? "bg-indigo-600 hover:bg-indigo-700" : ""}
      >
        ✅ Tried it
      </Button>
    </div>
  );
}