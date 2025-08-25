import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, User, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ConversationWithDetails, MessageWithSender } from "@shared/schema";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface MessagingInterfaceProps {
  conversation: ConversationWithDetails;
  onClose?: () => void;
}

export function MessagingInterface({ conversation, onClose }: MessagingInterfaceProps) {
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch messages for this conversation
  const { data: messages = [], isLoading } = useQuery<MessageWithSender[]>({
    queryKey: ["/api/conversations", conversation.id, "messages"],
    refetchInterval: 5000, // Refetch every 5 seconds for real-time feel
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/conversations/${conversation.id}/messages`, { content });
      return response.json();
    },
    onSuccess: () => {
      setMessageText("");
      // Invalidate messages to refresh
      queryClient.invalidateQueries({
        queryKey: ["/api/conversations", conversation.id, "messages"],
      });
      // Invalidate conversations list to update last message
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      // Invalidate unread count
      queryClient.invalidateQueries({ queryKey: ["/api/user/unread-messages"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mark messages as read when conversation is opened
  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/conversations/${conversation.id}/mark-read`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/unread-messages"] });
    },
  });

  // Mark as read when conversation opens
  useEffect(() => {
    if (conversation.unreadCount > 0) {
      markAsReadMutation.mutate();
    }
  }, [conversation.id]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(messageText.trim());
    }
  };

  return (
    <>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              {conversation.otherUser?.name || 'Unknown User'}
              {conversation.otherUser?.isEmailVerified && (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Re: {conversation.service?.title || conversation.job?.title || 'Unknown Service'}
            </p>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <Separator />

      <CardContent className="p-0 flex flex-col h-[calc(100vh-14rem)]">
        {/* Messages Area */}
        <ScrollArea className="flex-1 py-4 bg-gray-50">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-500">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <p className="text-gray-500 mb-2">No messages yet</p>
                <p className="text-sm text-gray-400 mb-3">Start the conversation!</p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2 max-w-sm mx-auto">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠️ Please keep conversations professional and safe
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 px-2">
              {messages.map((message) => {
                const isCurrentUser = message.senderId === user?.id;
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-2xl shadow-sm ${
                        isCurrentUser
                          ? "bg-blue-500 text-white rounded-br-md"
                          : "bg-white border border-gray-200 text-gray-900 rounded-bl-md"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">
                          {isCurrentUser ? "You" : message.sender.name}
                        </span>
                        <span className={`text-xs ${isCurrentUser ? "text-blue-100" : "text-gray-500"}`}>
                          {format(new Date(message.createdAt || 0), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Message Input */}
        <div className="border-t p-2">
          {messages.length <= 2 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-2">
              <p className="text-xs text-yellow-800 text-center">
                ⚠️ Please keep conversations professional and safe
              </p>
            </div>
          )}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
              disabled={sendMessageMutation.isPending}
            />
            <Button
              type="submit"
              disabled={!messageText.trim() || sendMessageMutation.isPending}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </>
  );
}