import { Crown, Plus, LogIn, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ChatUser, ChatRoom } from '@/types/chat';

interface ChatSidebarProps {
  currentUser: ChatUser;
  rooms: ChatRoom[];
  currentRoom: ChatRoom | null;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onRoomSelect: (roomId: string) => void;
  onClose: () => void;
}

export default function ChatSidebar({
  currentUser,
  rooms,
  currentRoom,
  onCreateRoom,
  onJoinRoom,
  onRoomSelect,
  onClose
}: ChatSidebarProps) {
  const getRandomAvatar = (seed: string) => 
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

  return (
    <>
      {/* Header */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary to-secondary">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary-foreground">ChatFlow</h1>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-primary-foreground hover:bg-white/20"
            onClick={onClose}
            data-testid="button-close-sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <img 
              src={currentUser.avatar || getRandomAvatar(currentUser.username)} 
              alt="User avatar" 
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-card online-indicator"></div>
          </div>
          <div>
            <p className="font-medium" data-testid="text-current-username">{currentUser.username}</p>
            <p className="text-sm text-muted-foreground">Online</p>
          </div>
        </div>
      </div>

      {/* Room Creation */}
      <div className="p-4 border-b border-border">
        <Button
          onClick={onCreateRoom}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          data-testid="button-create-room"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Room
        </Button>
      </div>

      {/* Rooms List */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Active Rooms ({rooms.length})
            </h3>
            
            <div className="space-y-2">
              {rooms.map((room) => {
                const isCurrentRoom = currentRoom?.id === room.id;
                const isAdmin = room.createdBy === currentUser.id;
                const memberCount = room.members.length;
                
                return (
                  <div
                    key={room.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      isCurrentRoom 
                        ? 'bg-primary/10 border border-primary/20' 
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => onRoomSelect(room.id)}
                    data-testid={`room-item-${room.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          memberCount > 0 ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                        <div>
                          <p className="font-medium" data-testid={`text-room-name-${room.id}`}>
                            {room.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {memberCount} member{memberCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      {isAdmin && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </div>
                );
              })}
              
              {rooms.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No rooms available</p>
                  <p className="text-sm">Create a room to get started!</p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      <Separator />

      {/* Join Room Button */}
      <div className="p-4">
        <Button
          variant="outline"
          onClick={onJoinRoom}
          className="w-full"
          data-testid="button-join-room"
        >
          <LogIn className="h-4 w-4 mr-2" />
          Join Room
        </Button>
      </div>
    </>
  );
}
