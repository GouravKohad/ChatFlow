import { formatDistanceToNow } from 'date-fns';
import { ChatMessage } from '@/types/chat';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  onImageClick: (url: string) => void;
}

export default function MessageBubble({ message, isOwn, onImageClick }: MessageBubbleProps) {
  const getRandomAvatar = (seed: string) => 
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  if (isOwn) {
    return (
      <div className="flex items-start justify-end space-x-3 message-fade-in" data-testid={`message-${message.id}`}>
        <div className="flex-1 flex flex-col items-end">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs text-muted-foreground" data-testid={`time-${message.id}`}>
              {formatTime(message.timestamp)}
            </span>
            <span className="font-medium text-sm">You</span>
          </div>
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
            ) : (
              <p data-testid={`content-${message.id}`}>{message.content}</p>
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
    <div className="flex items-start space-x-3 message-fade-in" data-testid={`message-${message.id}`}>
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
      </div>
    </div>
  );
}
