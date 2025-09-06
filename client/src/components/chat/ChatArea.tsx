import { useState, useRef, useEffect } from 'react';
import { Send, Image, Settings, Users, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import MessageBubble from './MessageBubble';
import { ChatRoom, ChatUser, ChatMessage, TypingUser } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';

interface ChatAreaProps {
  currentRoom: ChatRoom | null;
  currentUser: ChatUser;
  messages: ChatMessage[];
  typingUsers: TypingUser[];
  onSendMessage: (content: string, type?: string, imageUrl?: string) => void;
  onSetTyping: (isTyping: boolean) => void;
  onToggleUsers: () => void;
  onAdminControls: () => void;
  onImagePreview: (url: string) => void;
}

export default function ChatArea({
  currentRoom,
  currentUser,
  messages,
  typingUsers,
  onSendMessage,
  onSetTyping,
  onToggleUsers,
  onAdminControls,
  onImagePreview
}: ChatAreaProps) {
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end',
          inline: 'nearest'
        });
      }
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  const handleTyping = (typing: boolean) => {
    if (typing !== isTyping) {
      setIsTyping(typing);
      onSetTyping(typing);
    }

    if (typing) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        onSetTyping(false);
      }, 3000);
    }
  };

  const handleSendMessage = () => {
    const content = messageText.trim();
    if (!content) return;

    onSendMessage(content);
    setMessageText('');
    handleTyping(false);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    // Scroll to bottom after sending message
    scrollToBottom();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const { imageUrl } = await response.json();
      onSendMessage('', 'image', imageUrl);
      scrollToBottom();
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }

      handleImageUpload(file);
    }
    e.target.value = '';
  };

  const autoResize = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    element.style.height = Math.min(element.scrollHeight, 128) + 'px';
  };

  if (!currentRoom) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground mb-2">
            Welcome to ChatFlow
          </h2>
          <p className="text-muted-foreground">
            Select a room or create a new one to start chatting
          </p>
        </div>
      </div>
    );
  }

  const isAdmin = currentRoom.createdBy === currentUser.id;
  const onlineMembers = currentRoom.members.length;

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-card border-b border-border p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
          <div>
            <h2 className="font-semibold text-lg" data-testid="text-room-name">
              {currentRoom.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {onlineMembers} member{onlineMembers !== 1 ? 's' : ''} online
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onAdminControls}
              title="Admin Controls"
              data-testid="button-admin-controls"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleUsers}
            title="Show Users"
            className="lg:hidden"
            data-testid="button-toggle-users"
          >
            <Users className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            title="Room Info"
            data-testid="button-room-info"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Container - Separate scroll area */}
      <div className="flex-1 min-h-0">
        <div className="chat-messages-container p-4">
          <div className="space-y-4">
            {/* Welcome Message */}
            <div className="text-center">
              <div className="inline-block bg-muted text-muted-foreground px-3 py-1 rounded-full text-sm">
                Welcome to {currentRoom.name}! 🎉
              </div>
            </div>

            {/* Messages */}
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.userId === currentUser.id}
                onImageClick={onImagePreview}
              />
            ))}

            {/* Typing Indicators */}
            {typingUsers.map((user) => (
              <div key={user.userId} className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-xs font-medium">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-sm">{user.username}</span>
                    <span className="text-xs text-muted-foreground">typing...</span>
                  </div>
                  <div className="chat-bubble-received px-4 py-2 w-16">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full typing-indicator"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full typing-indicator" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full typing-indicator" style={{animationDelay: '0.4s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Message Input Area - Fixed at bottom */}
      <div className="chat-input-fixed border-t border-border p-4 bg-background flex-shrink-0">
        <div className="flex items-end space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            title="Share Image"
            data-testid="button-upload-image"
          >
            <Image className="h-4 w-4" />
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              placeholder="Type your message..."
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                autoResize(e.target);
                handleTyping(e.target.value.length > 0);
              }}
              onKeyDown={handleKeyPress}
              className="resize-none max-h-32 min-h-[2.5rem] bg-background"
              data-testid="input-message"
            />
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim()}
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
