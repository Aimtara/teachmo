import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, X, Send, Search } from 'lucide-react';
import { ultraMinimalToast } from '@/components/shared/UltraMinimalToast';

export default function LiveSupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('home'); // home, chat, search
  const [message, setMessage] = useState('');

  const toggleOpen = () => setIsOpen(!isOpen);

  const handleSend = () => {
    if (!message.trim()) return;
    // Mock sending message
    ultraMinimalToast('Message sent! Support will email you shortly.');
    setMessage('');
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      {isOpen && (
        <Card className="w-80 shadow-2xl border-gray-200 animate-in slide-in-from-bottom-5 duration-200">
          <CardHeader className="bg-blue-600 text-white rounded-t-xl p-4 flex flex-row justify-between items-center space-y-0">
            <CardTitle className="text-md font-medium">Teachmo Support</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-white hover:bg-blue-700"
              onClick={toggleOpen}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 bg-white">
            {view === 'home' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">How can we help you today?</p>
                <Button variant="outline" className="w-full justify-start" onClick={() => setView('search')}>
                  <Search className="mr-2 h-4 w-4" /> Search Help Docs
                </Button>
                <Button className="w-full justify-start" onClick={() => setView('chat')}>
                  <MessageCircle className="mr-2 h-4 w-4" /> Chat with Support
                </Button>
              </div>
            )}

            {view === 'chat' && (
              <div className="space-y-3">
                <Textarea
                  placeholder="Describe your issue..."
                  className="min-h-[100px] text-sm resize-none"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setView('home')}>
                    Back
                  </Button>
                  <Button size="sm" className="flex-1" onClick={handleSend}>
                    <Send className="mr-2 h-3 w-3" /> Send
                  </Button>
                </div>
              </div>
            )}

            {view === 'search' && (
              <div className="space-y-3">
                <Input placeholder="Search articles..." className="text-sm" />
                <div className="h-[100px] flex items-center justify-center text-xs text-gray-400 border rounded bg-gray-50">
                  No recent articles found.
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setView('home')}>
                  Back
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Button
        onClick={toggleOpen}
        className="h-14 w-14 rounded-full shadow-xl bg-blue-600 hover:bg-blue-700 transition-transform hover:scale-105 flex items-center justify-center"
        aria-label={isOpen ? 'Close support widget' : 'Open support widget'}
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </Button>
    </div>
  );
}
