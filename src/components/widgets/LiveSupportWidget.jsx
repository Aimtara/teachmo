import React, { useState } from 'react';
import { useNhostClient } from '@nhost/react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, X, Send, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ultraMinimalToast } from '@/components/shared/UltraMinimalToast';

export default function LiveSupportWidget() {
  const nhost = useNhostClient();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSending(true);
    setError(null);

    try {
      const { data, error: functionError } = await nhost.functions.call('support-message', {
        message: message.trim(),
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to send support message');
      }

      if (!data?.ok) {
        throw new Error(data?.error || 'Failed to send support message');
      }

      ultraMinimalToast("Message sent! Support will email you shortly.");
      setMessage("");
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to send support message:', err);
      const errorMessage = err.message || 'Failed to send message. Please try again.';
      setError(errorMessage);
      ultraMinimalToast(`Error: ${errorMessage}`, { type: 'error' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
          >
            <Card className="w-80 shadow-xl border-blue-100">
              <CardHeader className="flex flex-row items-center justify-between pb-2 bg-blue-50/50">
                <CardTitle className="text-sm font-medium text-blue-900">Contact Support</CardTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  <Textarea
                    placeholder="How can we help?"
                    className="min-h-[100px] resize-none text-sm"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={isSending}
                  />
                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700" 
                    disabled={isSending || !message.trim()}
                  >
                    {isSending ? "Sending..." : <><Send className="w-3 h-3 mr-2" /> Send Message</>}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`h-12 w-12 rounded-full shadow-lg transition-transform hover:scale-105 ${
          isOpen ? 'bg-gray-100 text-gray-600' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>
    </div>
  );
}
