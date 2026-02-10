import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ultraMinimalToast } from '@/components/shared/UltraMinimalToast';
import { apiClient } from '@/services/core/client';

export default function LiveSupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setIsSending(true);
    try {
      await apiClient.post('/api/support-tickets', { message: message.trim() });
      ultraMinimalToast("Message sent! Support will email you shortly.");
      setMessage("");
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to send support ticket', error);
      ultraMinimalToast('Unable to send your message right now. Please try again.');
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
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}><X className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent className="p-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Textarea 
                    placeholder="How can we help?" 
                    className="min-h-[100px] resize-none text-sm"
                    value={message} 
                    onChange={(e) => setMessage(e.target.value)} 
                  />
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isSending}>
                    {isSending ? "Sending..." : <><Send className="w-3 h-3 mr-2" /> Send Message</>}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      <Button onClick={() => setIsOpen(!isOpen)} className={`h-12 w-12 rounded-full shadow-lg ${isOpen ? 'bg-gray-100 text-gray-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>
    </div>
  );
}
