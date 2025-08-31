import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Send, User, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ConversationWithDetails, MessageWithSender } from "@shared/schema";
import { format } from "date-fns";
import { MessagingInterface } from "../components/messaging-interface";

export default function MessagesPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Check for conversation ID in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get('conversation');
    if (conversationId) {
      setSelectedConversationId(conversationId);
      // Clean up the URL by removing the parameter
      window.history.replaceState({}, '', '/messages');
    }
  }, []);

  // Fetch user conversations
  const { data: conversations = [], isLoading } = useQuery<ConversationWithDetails[]>({
    queryKey: ["/api/conversations"],
  });

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <MessageCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Loading conversations...</p>
          </div>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
              <p className="text-gray-500 mb-4">
                Conversations will appear here when job posters start messaging with applicants.
              </p>
              <p className="text-sm text-gray-400">
                As a job poster, you can initiate conversations from your dashboard when reviewing applications.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 h-[calc(100vh-8rem)]">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
        {/* Conversation List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Conversations ({conversations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-12rem)]">
              <div className="space-y-1 px-1 py-1">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`cursor-pointer p-2 rounded-sm border-l-2 transition-all duration-200 overflow-hidden ${
                      selectedConversationId === conversation.id
                        ? "bg-blue-50 border-l-blue-500 shadow-sm"
                        : conversation.unreadCount > 0
                        ? "bg-gray-100 border-l-orange-400 hover:bg-gray-150 hover:border-l-orange-500 shadow-sm"
                        : "bg-white border-l-transparent hover:bg-gray-50 hover:border-l-gray-300"
                    }`}
                    onClick={() => setSelectedConversationId(conversation.id)}
                  >
                    <div className="flex items-start justify-between min-h-0 w-full">
                      <div className="flex-1 min-w-0 pr-1 overflow-hidden">
                        <div className="flex items-center gap-1.5 mb-1">
                          <User className={`h-3.5 w-3.5 flex-shrink-0 ${conversation.unreadCount > 0 ? 'text-gray-600' : 'text-gray-400'}`} />
                          <span className={`text-sm truncate max-w-[120px] ${conversation.unreadCount > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {conversation.otherUser.name}
                          </span>
                          {conversation.otherUser.isEmailVerified && (
                            <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                          )}
                          {conversation.unreadCount > 0 && (
                            <Badge variant="destructive" className="h-3.5 text-sm px-1 ml-auto flex-shrink-0">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <p className={`text-sm mb-1 leading-tight overflow-hidden ${conversation.unreadCount > 0 ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>
                          {(() => {
                            const title = conversation.service?.title || conversation.job?.title || 'Unknown';
                            return title.length > 30 ? `${title.substring(0, 30)}...` : title;
                          })()}
                        </p>
                        {conversation.lastMessage && (
                          <p className={`text-sm leading-tight overflow-hidden ${conversation.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                            {conversation.lastMessage.content.length > 35 
                              ? `${conversation.lastMessage.content.substring(0, 35)}...` 
                              : conversation.lastMessage.content}
                          </p>
                        )}
                      </div>
                      <div className="text-sm text-gray-400 flex-shrink-0 self-start">
                        {format(new Date(conversation.lastMessageAt || conversation.createdAt || new Date()), "MMM d")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Message Interface */}
        <Card className="md:col-span-2 flex flex-col">
          {selectedConversation ? (
            <MessagingInterface
              conversation={selectedConversation}
              onClose={() => setSelectedConversationId(null)}
            />
          ) : (
            <CardContent className="p-8 h-full flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-500">
                  Choose a conversation from the list to view messages
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}