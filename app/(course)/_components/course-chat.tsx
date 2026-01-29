"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import axios from "axios";
import { Send, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/lib/contexts/language-context";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  message: string;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    image: string | null;
    role: string;
  };
}

interface CourseChatProps {
  courseId: string;
}

export const CourseChat = ({ courseId }: CourseChatProps) => {
  const { data: session } = useSession();
  const userId = session?.user?.id || "";
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages
  const fetchMessages = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const response = await axios.get(`/api/courses/${courseId}/chat`);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !userId) return;

    try {
      setSending(true);
      const response = await axios.post(`/api/courses/${courseId}/chat`, {
        message: newMessage.trim(),
      });
      
      setMessages((prev) => [...prev, response.data.message]);
      setNewMessage("");
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error: any) {
      console.error("Error sending message:", error);
      alert(error.response?.data?.error || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // Poll for new messages
  useEffect(() => {
    if (!isOpen || !userId) return;

    fetchMessages();
    
    const interval = setInterval(() => {
      fetchMessages();
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [isOpen, courseId, userId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages]);

  // Don't show chat if user is not logged in
  if (!userId) {
    return null;
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 left-4 md:bottom-6 md:left-6 z-50 rounded-full h-12 w-12 md:h-14 md:w-14 shadow-lg"
        size="icon"
      >
        {isOpen ? (
          <X className="h-5 w-5 md:h-6 md:w-6" />
        ) : (
          <MessageSquare className="h-5 w-5 md:h-6 md:w-6" />
        )}
      </Button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed inset-0 md:inset-auto md:bottom-24 md:left-6 md:right-auto md:top-auto z-50 w-full md:w-96 h-full md:h-[600px] md:max-h-[600px] bg-white dark:bg-gray-900 md:rounded-lg shadow-2xl border flex flex-col">
          {/* Header */}
          <div className="p-3 md:p-4 border-b flex items-center justify-between flex-shrink-0">
            <h3 className="font-semibold text-base md:text-lg">
              {t("course.chat") || "Course Chat"}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-3 md:p-4 overflow-y-auto min-h-0">
            {loading && messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>{t("course.noMessages") || "No messages yet. Start the conversation!"}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isOwnMessage = msg.user.id === userId;
                  const isTeacher = msg.user.role === "TEACHER";

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${
                        isOwnMessage ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={msg.user.image || undefined} />
                        <AvatarFallback>
                          {getInitials(msg.user.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`flex flex-col max-w-[75%] md:max-w-[75%] ${
                          isOwnMessage ? "items-end" : "items-start"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 md:gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-medium">
                            {msg.user.fullName}
                          </span>
                          {isTeacher && (
                            <span className="text-xs px-1.5 md:px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                              {t("course.teacher") || "Teacher"}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground whitespace-nowrap" dir="ltr">
                            {formatDistanceToNow(new Date(msg.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        <div
                          className={`rounded-lg px-3 py-2 md:px-4 md:py-2 ${
                            isOwnMessage
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {msg.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 md:p-4 border-t flex gap-2 flex-shrink-0">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t("course.typeMessage") || "Type a message..."}
              disabled={sending}
              maxLength={2000}
              className="text-sm md:text-base"
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              size="icon"
              className="flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

