import { Crown, Ban, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatUser, ChatRoom } from '@/types/chat';

interface UsersListProps {
  currentUser: ChatUser;
  currentRoom: ChatRoom;
  members: ChatUser[];
  onBlockUser: (userId: string) => void;
  onUnblockUser: (userId: string) => void;
  onClose: () => void;
}

export default function UsersList({
  currentUser,
  currentRoom,
  members,
  onBlockUser,
  onUnblockUser,
  onClose
}: UsersListProps) {
  const isAdmin = currentRoom.createdBy === currentUser.id;
  const getRandomAvatar = (seed: string) => 
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center space-x-2">
          <span>Members ({members.length})</span>
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="lg:hidden"
          data-testid="button-close-users"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="space-y-3">
          {/* Admin User (Current User if admin) */}
          {isAdmin && (
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    src={currentUser.avatar || getRandomAvatar(currentUser.username)}
                    alt="User avatar"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-card"></div>
                </div>
                <div>
                  <p className="font-medium text-sm" data-testid={`user-${currentUser.id}-name`}>
                    {currentUser.username} (You)
                  </p>
                  <p className="text-xs text-muted-foreground">Admin</p>
                </div>
              </div>
              <Crown className="h-4 w-4 text-yellow-500" />
            </div>
          )}

          {/* Regular Users */}
          {members.filter(member => member.id !== currentUser.id).map((member) => {
            const isBlocked = currentRoom.blockedUsers.includes(member.id);
            const memberIsAdmin = currentRoom.createdBy === member.id;
            
            return (
              <div
                key={member.id}
                className={`flex items-center justify-between p-2 rounded-lg transition-colors group ${
                  isBlocked ? 'bg-red-50 border border-red-200' : 'hover:bg-muted'
                }`}
                data-testid={`user-item-${member.id}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img
                      src={member.avatar || getRandomAvatar(member.username)}
                      alt="User avatar"
                      className={`w-8 h-8 rounded-full object-cover ${isBlocked ? 'grayscale' : ''}`}
                    />
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-card ${
                      isBlocked ? 'bg-red-500' : member.isOnline ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${isBlocked ? 'text-red-600' : ''}`} data-testid={`user-${member.id}-name`}>
                      {member.username}
                    </p>
                    <p className={`text-xs ${
                      isBlocked ? 'text-red-500' : 
                      member.isOnline ? 'text-green-600' : 'text-muted-foreground'
                    }`}>
                      {isBlocked ? 'Blocked' : member.isOnline ? 'Online' : 'Away'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  {memberIsAdmin && (
                    <Crown className="h-4 w-4 text-yellow-500" />
                  )}
                  
                  {isAdmin && !memberIsAdmin && (
                    <div className="flex space-x-1">
                      {isBlocked ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-green-600 hover:bg-green-100"
                          onClick={() => onUnblockUser(member.id)}
                          title="Unblock User"
                          data-testid={`button-unblock-${member.id}`}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => onBlockUser(member.id)}
                          title="Block User"
                          data-testid={`button-block-${member.id}`}
                        >
                          <Ban className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {members.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No members online</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
