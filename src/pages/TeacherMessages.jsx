import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/hooks/useAuth';
import { OrgService } from '@/services/org/api';
import { UserConversation, UserMessage } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send } from 'lucide-react';

function formatMessageTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

function makeThreadId(courseId) {
  return `teacher_course_${courseId}`;
}

export default function TeacherMessages() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const courseIdParam = searchParams.get('course_id');

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [messages, setMessages] = useState([]);
  const [messageBody, setMessageBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadClasses = async () => {
      if (!user?.id) return;
      setLoading(true);
      setError('');
      try {
        const classData = await OrgService.getClassrooms(user.id);
        setClasses(classData);

        const preferredClassId =
          (courseIdParam && classData.find((course) => course.id === courseIdParam)?.id) ||
          classData[0]?.id ||
          '';
        setSelectedClassId(preferredClassId);
      } catch (loadError) {
        console.error('Failed to load classes for teacher messages:', loadError);
        setError('Unable to load your classes right now.');
      } finally {
        setLoading(false);
      }
    };

    loadClasses();
  }, [user?.id, courseIdParam]);

  const selectedClass = useMemo(
    () => classes.find((cls) => cls.id === selectedClassId) || null,
    [classes, selectedClassId]
  );

  const selectedThreadId = selectedClass ? makeThreadId(selectedClass.id) : null;

  useEffect(() => {
    const loadConversationAndMessages = async () => {
      if (!user?.id || !selectedThreadId) {
        setMessages([]);
        return;
      }

      setError('');

      try {
        const existing = await UserConversation.filter({ thread_id: selectedThreadId });
        let conversation = Array.isArray(existing) && existing.length > 0 ? existing[0] : null;

        if (!conversation) {
          conversation = await UserConversation.create({
            thread_id: selectedThreadId,
            participant_ids: [user.id],
            last_activity: new Date().toISOString(),
          });
        }

        const threadMessages = await UserMessage.filter({ thread_id: selectedThreadId }, 'created_date');
        setMessages(Array.isArray(threadMessages) ? threadMessages : []);
      } catch (loadError) {
        console.error('Failed to load class messages:', loadError);
        setError('Unable to load this class conversation.');
      }
    };

    loadConversationAndMessages();
  }, [user?.id, selectedThreadId]);

  const handleSendMessage = async () => {
    if (!messageBody.trim() || !user?.id || !selectedThreadId || isSending) return;

    setIsSending(true);
    setError('');

    try {
      const created = await UserMessage.create({
        thread_id: selectedThreadId,
        sender_id: user.id,
        recipient_id: user.id,
        content: messageBody.trim(),
        message_type: 'text',
        is_read: true,
      });

      const existing = await UserConversation.filter({ thread_id: selectedThreadId });
      const conversation = Array.isArray(existing) && existing.length > 0 ? existing[0] : null;
      if (conversation?.id) {
        await UserConversation.update(conversation.id, {
          last_message_preview: messageBody.trim().slice(0, 100),
          last_activity: new Date().toISOString(),
        });
      }

      setMessages((prev) => [...prev, created]);
      setMessageBody('');
    } catch (sendError) {
      console.error('Failed to send class message:', sendError);
      setError('Unable to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['teacher', 'school_admin', 'district_admin', 'system_admin', 'admin']} requireAuth>
      <div className="min-h-screen bg-warm-cream p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <header>
            <h1 className="text-3xl font-bold text-gray-900">Teacher Messages</h1>
            <p className="text-gray-600">Send class updates and keep communication in one place.</p>
          </header>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="h-[560px] bg-gray-100 rounded-xl animate-pulse" />
              <div className="lg:col-span-2 h-[560px] bg-gray-100 rounded-xl animate-pulse" />
            </div>
          ) : classes.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center space-y-3">
                <MessageSquare className="w-10 h-10 text-gray-400 mx-auto" />
                <h2 className="text-lg font-semibold">No classes available</h2>
                <p className="text-sm text-gray-600">Connect or sync your classes before sending messages.</p>
                <Link to={createPageUrl('TeacherClasses')}>
                  <Button variant="outline">Go to Classes</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="h-[620px]">
                <CardHeader>
                  <CardTitle>Classes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {classes.map((cls) => (
                    <button
                      key={cls.id}
                      type="button"
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        cls.id === selectedClassId
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedClassId(cls.id)}
                    >
                      <p className="font-medium text-gray-900 line-clamp-1">{cls.name}</p>
                      <p className="text-xs text-gray-600">{cls.studentCount || 0} students</p>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2 h-[620px] flex flex-col">
                <CardHeader className="border-b">
                  <CardTitle>{selectedClass?.name || 'Select a class'}</CardTitle>
                  <p className="text-sm text-gray-600">Class thread {selectedClass ? `for ${selectedClass.name}` : ''}</p>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col gap-4 p-4 min-h-0">
                  {error && <p className="text-sm text-red-700" role="alert">{error}</p>}

                  <ScrollArea className="flex-1 pr-3">
                    <div className="space-y-3">
                      {messages.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 text-sm">
                          No messages in this class yet. Send the first update below.
                        </div>
                      ) : (
                        messages.map((message) => {
                          const isMine = (message.sender_id || message.senderId) === user?.id;
                          return (
                            <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                              <div
                                className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                                  isMine ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                                }`}
                              >
                                <p>{message.content || message.body}</p>
                                <p className={`text-[11px] mt-1 ${isMine ? 'text-blue-100' : 'text-gray-500'}`}>
                                  {formatMessageTime(message.created_date || message.created_at || message.timestamp)}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>

                  <div className="border-t pt-4 space-y-2">
                    <label className="text-sm font-medium text-gray-800" htmlFor="class-message-input">
                      Message {selectedClass ? `to ${selectedClass.name}` : ''}
                    </label>
                    <Textarea
                      id="class-message-input"
                      placeholder="Write a class update…"
                      value={messageBody}
                      onChange={(event) => setMessageBody(event.target.value)}
                      rows={3}
                    />
                    <div className="flex justify-end">
                      <Button onClick={handleSendMessage} disabled={isSending || !messageBody.trim() || !selectedClassId}>
                        <Send className="w-4 h-4 mr-2" />
                        {isSending ? 'Sending…' : 'Send Message'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
