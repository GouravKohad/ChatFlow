import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Edit2, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChatMessage } from '@/types/chat';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  onImageClick: (url: string) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  isAdmin?: boolean;
}

export default function MessageBubble({ 
  message, 
  isOwn, 
  onImageClick, 
  onEditMessage, 
  onDeleteMessage,
  isAdmin = false 
}: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const getRandomAvatar = (seed: string) => 
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent.trim() !== message.content && onEditMessage) {
      onEditMessage(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (onDeleteMessage && window.confirm('Are you sure you want to delete this message?')) {
      onDeleteMessage(message.id);
    }
  };

  const canEdit = isOwn && message.type === 'text';
  const canDelete = isOwn || isAdmin;

  if (isOwn) {
    return (
      <div className="flex items-start justify-end space-x-3 message-fade-in group" data-testid={`message-${message.id}`}>
        <div className="flex-1 flex flex-col items-end">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs text-muted-foreground" data-testid={`time-${message.id}`}>
              {formatTime(message.timestamp)}
            </span>
            <span className="font-medium text-sm">You</span>
          </div>
          <div className="relative group">
            <div className="chat-bubble-sent px-4 py-2 max-w-md">
              {message.type === 'image' ? (
                <>
                  {message.content && (
                    <p className="mb-2" data-testid={`content-${message.id}`}>{message.content}</p>
                  )}
                  <img
                    src={message.imageUrl}
                    alt="Shared image"
                    className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => onImageClick(message.imageUrl!)}
                    data-testid={`image-${message.id}`}
                  />
                </>
              ) : isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[2rem] resize-none bg-background"
                    data-testid={`edit-input-${message.id}`}
                  />
                  <div className="flex justify-end space-x-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleSaveEdit}
                      className="h-6 px-2"
                      data-testid={`save-edit-${message.id}`}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      className="h-6 px-2"
                      data-testid={`cancel-edit-${message.id}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p data-testid={`content-${message.id}`}>{message.content}</p>
              )}
            </div>
            
            {/* Action buttons */}
            {!isEditing && (canEdit || canDelete) && (
              <div className="absolute -left-16 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                {canEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                    className="h-6 w-6 p-0 hover:bg-background/80"
                    data-testid={`edit-${message.id}`}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDelete}
                    className="h-6 w-6 p-0 hover:bg-background/80 hover:text-destructive"
                    data-testid={`delete-${message.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        <img
          src={message.avatar || getRandomAvatar(message.username)}
          alt="Your avatar"
          className="w-8 h-8 rounded-full object-cover"
          data-testid={`avatar-${message.id}`}
        />
      </div>
    );
  }

  return (
    <div className="flex items-start space-x-3 message-fade-in group" data-testid={`message-${message.id}`}>
      <img
        src={message.avatar || getRandomAvatar(message.username)}
        alt="User avatar"
        className="w-8 h-8 rounded-full object-cover"
        data-testid={`avatar-${message.id}`}
      />
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-1">
          <span className="font-medium text-sm" data-testid={`username-${message.id}`}>
            {message.username}
          </span>
          <span className="text-xs text-muted-foreground" data-testid={`time-${message.id}`}>
            {formatTime(message.timestamp)}
          </span>
        </div>
        <div className="relative group">
          <div className="chat-bubble-received px-4 py-2 max-w-md">
            {message.type === 'image' ? (
              <>
                {message.content && (
                  <p className="mb-2" data-testid={`content-${message.id}`}>{message.content}</p>
                )}
                <img
                  src={message.imageUrl}
                  alt="Shared image"
                  className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onImageClick(message.imageUrl!)}
                  data-testid={`image-${message.id}`}
                />
              </>
            ) : (
              <p data-testid={`content-${message.id}`}>{message.content}</p>
            )}
          </div>
          
          {/* Delete button for admin */}
          {canDelete && !isOwn && (
            <div className="absolute -right-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                className="h-6 w-6 p-0 hover:bg-background/80 hover:text-destructive"
                data-testid={`delete-${message.id}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
