import { Crown, Ban, Check, UserMinus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChatUser, ChatRoom } from '@/types/chat';

interface AdminControlsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRoom: ChatRoom;
  currentUser: ChatUser;
  members: ChatUser[];
  onBlockUser: (userId: string) => void;
  onUnblockUser: (userId: string) => void;
}

export default function AdminControlsModal({
  open,
  onOpenChange,
  currentRoom,
  currentUser,
  members,
  onBlockUser,
  onUnblockUser
}: AdminControlsModalProps) {
  const getRandomAvatar = (seed: string) => 
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  const isAdmin = currentRoom.createdBy === currentUser.id;

  if (!isAdmin) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="modal-admin-controls">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <span>Admin Controls</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Room Settings */}
          <div className="border border-border rounded-lg p-4">
            <h4 className="font-medium mb-3">Room Settings</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Room Name</span>
                <span className="text-sm font-medium" data-testid="text-admin-room-name">
                  {currentRoom.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Created</span>
                <span className="text-sm text-muted-foreground">
                  {formatDate(currentRoom.createdAt)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Members</span>
                <span className="text-sm">{currentRoom.members.length} users</span>
              </div>
              {currentRoom.description && (
                <div className="flex items-start justify-between">
                  <span className="text-sm">Description</span>
                  <span className="text-sm text-muted-foreground text-right max-w-xs">
                    {currentRoom.description}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* User Management */}
          <div className="border border-border rounded-lg p-4">
            <h4 className="font-medium mb-3">User Management</h4>
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {members.filter(member => member.id !== currentUser.id).map((member) => {
                  const isBlocked = currentRoom.blockedUsers.includes(member.id);
                  
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded"
                      data-testid={`admin-user-${member.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={member.avatar || getRandomAvatar(member.username)}
                          alt="User avatar"
                          className={`w-6 h-6 rounded-full object-cover ${isBlocked ? 'grayscale' : ''}`}
                        />
                        <span className={`text-sm font-medium ${isBlocked ? 'text-red-600' : ''}`}>
                          {member.username}
                        </span>
                        {isBlocked && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                            Blocked
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-1">
                        {isBlocked ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-green-500 hover:bg-green-100"
                            onClick={() => onUnblockUser(member.id)}
                            title="Unblock User"
                            data-testid={`button-admin-unblock-${member.id}`}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500 hover:bg-red-100"
                            onClick={() => onBlockUser(member.id)}
                            title="Block User"
                            data-testid={`button-admin-block-${member.id}`}
                          >
                            <Ban className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-orange-500 hover:bg-orange-100"
                          title="Kick User"
                          data-testid={`button-admin-kick-${member.id}`}
                        >
                          <UserMinus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                
                {members.filter(m => m.id !== currentUser.id).length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No other members in this room
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          {/* Danger Zone */}
          <div className="border border-red-200 bg-red-50 rounded-lg p-4">
            <h4 className="font-medium text-red-700 mb-3">Danger Zone</h4>
            <Button
              variant="destructive"
              className="w-full"
              data-testid="button-delete-room"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Room
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
