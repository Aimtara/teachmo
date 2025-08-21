import React, { useState, useEffect } from "react";
import { User, UserMessage, UserConversation, Student, Course, TeacherClassAssignment, StudentParentLink } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquare, Send, Plus, Search, Users, Clock, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO, isToday, isYesterday } from "date-fns";

export default function ParentTeacherMessaging({ user }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user) {
      loadConversations();
      if (user.role === 'parent') {
        loadStudentsAndTeachers();
      }
    }
  }, [user]);

  const loadConversations = async () => {
    try {
      const userConversations = await UserConversation.filter({
        participant_ids: { $in: [user.id] }
      }, '-last_activity');
      
      setConversations(userConversations);
      
      if (userConversations.length > 0 && !selectedConversation) {
        setSelectedConversation(userConversations[0]);
        await loadMessages(userConversations[0].thread_id);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStudentsAndTeachers = async () => {
    try {
      // Get parent's linked students
      const studentLinks = await StudentParentLink.filter({ 
        parent_user_id: user.id,
        verification_status: 'verified'
      });
      
      if (studentLinks.length === 0) return;
      
      const studentIds = studentLinks.map(link => link.student_id);
      const studentsData = await Promise.all(
        studentIds.map(id => Student.get(id).catch(() => null))
      );
      
      const validStudents = studentsData.filter(Boolean);
      setStudents(validStudents);
      
      // Get teachers for these students
      const teachersSet = new Set();
      for (const student of validStudents) {
        try {
          // Find courses this student is enrolled in
          const enrollments = await Enrollment.filter({ student_id: student.id });
          
          for (const enrollment of enrollments) {
            // Find teachers for these courses
            const teacherAssignments = await TeacherClassAssignment.filter({
              course_id: enrollment.course_id,
              is_active: true
            });
            
            for (const assignment of teacherAssignments) {
              try {
                const teacher = await User.get(assignment.teacher_user_id);
                if (teacher) {
                  teachersSet.add(JSON.stringify({
                    ...teacher,
                    course_id: enrollment.course_id,
                    student_id: student.id
                  }));
                }
              } catch (error) {
                console.error(`Error fetching teacher ${assignment.teacher_user_id}:`, error);
              }
            }
          }
        } catch (error) {
          console.error(`Error loading data for student ${student.id}:`, error);
        }
      }
      
      const teachersArray = Array.from(teachersSet).map(t => JSON.parse(t));
      setAvailableTeachers(teachersArray);
      
    } catch (error) {
      console.error("Error loading students and teachers:", error);
    }
  };

  const loadMessages = async (threadId) => {
    try {
      const threadMessages = await UserMessage.filter({ 
        thread_id: threadId 
      }, 'created_date');
      
      setMessages(threadMessages);
      
      // Mark messages as read
      const unreadMessages = threadMessages.filter(m => 
        m.recipient_id === user.id && !m.is_read
      );
      
      for (const message of unreadMessages) {
        await UserMessage.update(message.id, { is_read: true });
      }
      
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return;
    
    setIsSending(true);
    
    try {
      // Find recipient (the other participant in the conversation)
      const recipientId = selectedConversation.participant_ids.find(id => id !== user.id);
      
      const message = await UserMessage.create({
        sender_id: user.id,
        recipient_id: recipientId,
        content: newMessage.trim(),
        thread_id: selectedConversation.thread_id,
        message_type: 'text',
        is_read: false
      });
      
      // Update conversation
      await UserConversation.update(selectedConversation.id, {
        last_message_id: message.id,
        last_message_preview: newMessage.trim().substring(0, 100),
        last_activity: new Date().toISOString()
      });
      
      // Add message to local state
      setMessages(prev => [...prev, message]);
      setNewMessage("");
      
      // Refresh conversations to update last activity
      await loadConversations();
      
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleStartNewConversation = async () => {
    if (!selectedTeacher || !selectedStudent) return;
    
    try {
      const threadId = `${user.id}_${selectedTeacher.id}_${Date.now()}`;
      
      // Create conversation
      const conversation = await UserConversation.create({
        thread_id: threadId,
        participant_ids: [user.id, selectedTeacher.id],
        last_activity: new Date().toISOString()
      });
      
      // Send initial message if there's content
      if (newMessage.trim()) {
        const message = await UserMessage.create({
          sender_id: user.id,
          recipient_id: selectedTeacher.id,
          content: newMessage.trim(),
          thread_id: threadId,
          message_type: 'text',
          is_read: false
        });
        
        await UserConversation.update(conversation.id, {
          last_message_id: message.id,
          last_message_preview: newMessage.trim().substring(0, 100)
        });
      }
      
      setShowNewConversation(false);
      setNewMessage("");
      setSelectedTeacher(null);
      setSelectedStudent(null);
      
      await loadConversations();
      
    } catch (error) {
      console.error("Error starting new conversation:", error);
    }
  };

  const formatMessageTime = (dateString) => {
    const date = parseISO(dateString);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM d');
    }
  };

  const getConversationTitle = (conversation) => {
    // Find the other participant
    const otherParticipantId = conversation.participant_ids.find(id => id !== user.id);
    // In a real app, you'd fetch and cache user details
    return `Conversation with Teacher`; // Simplified for now
  };

  const filteredConversations = conversations.filter(conv => 
    getConversationTitle(conv).toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.last_message_preview?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 animate-pulse mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Conversations Sidebar */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Messages</h3>
            {user.role === 'parent' && (
              <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>New Message</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Select Student</label>
                      <select
                        value={selectedStudent?.id || ""}
                        onChange={(e) => {
                          const student = students.find(s => s.id === e.target.value);
                          setSelectedStudent(student);
                        }}
                        className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Choose a student...</option>
                        {students.map(student => (
                          <option key={student.id} value={student.id}>
                            {student.first_name} {student.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700">Select Teacher</label>
                      <select
                        value={selectedTeacher?.id || ""}
                        onChange={(e) => {
                          const teacher = availableTeachers.find(t => t.id === e.target.value);
                          setSelectedTeacher(teacher);
                        }}
                        className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                        disabled={!selectedStudent}
                      >
                        <option value="">Choose a teacher...</option>
                        {availableTeachers
                          .filter(t => !selectedStudent || t.student_id === selectedStudent.id)
                          .map(teacher => (
                            <option key={teacher.id} value={teacher.id}>
                              {teacher.full_name}
                            </option>
                          ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700">Message</label>
                      <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowNewConversation(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleStartNewConversation}
                        disabled={!selectedTeacher || !selectedStudent}
                      >
                        Start Conversation
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No conversations yet</p>
                {user.role === 'parent' && (
                  <p className="text-xs mt-1">Start a conversation with your child's teacher</p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredConversations.map(conversation => (
                  <div
                    key={conversation.id}
                    onClick={() => {
                      setSelectedConversation(conversation);
                      loadMessages(conversation.thread_id);
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedConversation?.id === conversation.id
                        ? 'bg-blue-50 border-blue-200 border'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium text-sm text-gray-900 truncate">
                        {getConversationTitle(conversation)}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {conversation.last_activity && formatMessageTime(conversation.last_activity)}
                      </span>
                    </div>
                    {conversation.last_message_preview && (
                      <p className="text-xs text-gray-600 truncate">
                        {conversation.last_message_preview}
                      </p>
                    )}
                    {conversation.unread_count?.[user.id] > 0 && (
                      <Badge className="bg-blue-600 text-white text-xs mt-1">
                        {conversation.unread_count[user.id]} new
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Messages Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <h3 className="font-semibold text-gray-900">
                {getConversationTitle(selectedConversation)}
              </h3>
              <p className="text-sm text-gray-500">
                {messages.length} {messages.length === 1 ? 'message' : 'messages'}
              </p>
            </div>

            {/* Messages List */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                <AnimatePresence>
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.sender_id === user.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <div className={`flex items-center gap-1 mt-1 text-xs ${
                          message.sender_id === user.id ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          <span>{formatMessageTime(message.created_date)}</span>
                          {message.sender_id === user.id && message.is_read && (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Conversation</h3>
              <p className="text-gray-600">
                Choose a conversation from the sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}