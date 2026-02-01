import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageCircle, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ultraMinimalToast } from '@/components/shared/UltraMinimalToast';
import { API_BASE_URL } from '@/config/api';
import { nhost } from '@/lib/nhostClient';

export default function LiveSupportWidgetFloating() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSending(true);

    try {
      const token = nhost.auth.getAccessToken();
      const res = await fetch(`${API_BASE_URL}/support/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ message: message.trim() })
      });

      if (!res.ok) {
        throw new Error(`Support request failed: ${res.statusText}`);
      }

      ultraMinimalToast.success("Message sent! Support will email you shortly.");
      setMessage("");
      setIsOpen(false);
    } catch (error) {
      console.error('Support message error:', error);
      ultraMinimalToast.error("Failed to send message. Please try again or email support@teachmo.com");
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
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6" 
                  onClick={() => setIsOpen(false)}
                  aria-label="Close support widget"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="support-message" className="sr-only">
                      Your message
                    </Label>
                    <Textarea
                      id="support-message"
                      placeholder="How can we help?"
                      className="min-h-[100px] resize-none text-sm"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isSending}>
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
        aria-label={isOpen ? "Close support widget" : "Open support widget"}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>
    </div>
  );
}
