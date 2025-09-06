import { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatArea from '@/components/chat/ChatArea';
import UsersList from '@/components/chat/UsersList';
import CreateRoomModal from '@/components/modals/CreateRoomModal';
import JoinRoomModal from '@/components/modals/JoinRoomModal';
import AdminControlsModal from '@/components/modals/AdminControlsModal';
import ImagePreviewModal from '@/components/modals/ImagePreviewModal';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

export default function Chat() {
  const socket = useSocket();
  const [username, setUsername] = useLocalStorage('chat_username', '');
  const [avatar, setAvatar] = useLocalStorage('chat_avatar', '');
  const [isJoined, setIsJoined] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [usersListOpen, setUsersListOpen] = useState(false);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [joinRoomOpen, setJoinRoomOpen] = useState(false);
  const [adminControlsOpen, setAdminControlsOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Auto-join if we have a saved username
  useEffect(() => {
    if (username && socket.isConnected && !isJoined) {
      socket.joinChat(username, avatar);
      setIsJoined(true);
    }
  }, [username, avatar, socket.isConnected, socket.joinChat, isJoined]);

  // Initial join form
  if (!isJoined || !socket.currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-xl p-6 w-full max-w-md shadow-xl border border-border">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              ChatFlow
            </h1>
            <p className="text-muted-foreground mt-2">Join the conversation</p>
          </div>
          
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const newUsername = formData.get('username') as string;
              const newAvatar = formData.get('avatar') as string;
              
              if (newUsername.trim()) {
                setUsername(newUsername.trim());
                setAvatar(newAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUsername}`);
                socket.joinChat(newUsername.trim(), newAvatar);
                setIsJoined(true);
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <input
                name="username"
                type="text"
                placeholder="Enter your username..."
                defaultValue={username}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                required
                data-testid="input-username"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Avatar URL (Optional)</label>
              <input
                name="avatar"
                type="url"
                placeholder="https://example.com/avatar.jpg"
                defaultValue={avatar}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                data-testid="input-avatar"
              />
            </div>
            
            <Button type="submit" className="w-full" data-testid="button-join-chat">
              Join Chat
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Mobile Menu Button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setSidebarOpen(true)}
        data-testid="button-mobile-menu"
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          data-testid="overlay-mobile"
        />
      )}

      {/* Sidebar */}
      <div className={`sidebar-slide w-80 bg-card border-r border-border flex flex-col fixed lg:relative h-full z-40 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <ChatSidebar
          currentUser={socket.currentUser}
          rooms={socket.rooms}
          currentRoom={socket.currentRoom}
          onCreateRoom={() => setCreateRoomOpen(true)}
          onJoinRoom={() => setJoinRoomOpen(true)}
          onRoomSelect={socket.joinRoom}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <ChatArea
          currentRoom={socket.currentRoom}
          currentUser={socket.currentUser}
          messages={socket.messages}
          typingUsers={socket.typingUsers}
          onSendMessage={socket.sendChatMessage}
          onSetTyping={socket.setTyping}
          onToggleUsers={() => setUsersListOpen(!usersListOpen)}
          onAdminControls={() => setAdminControlsOpen(true)}
          onImagePreview={setImagePreview}
          onEditMessage={socket.editMessage}
          onDeleteMessage={socket.deleteMessage}
        />
      </div>

      {/* Users List */}
      {socket.currentRoom && (
        <div className={`w-64 border-l border-border bg-card ${usersListOpen ? 'block' : 'hidden lg:block'}`}>
          <UsersList
            currentUser={socket.currentUser}
            currentRoom={socket.currentRoom}
            members={socket.roomMembers}
            onBlockUser={socket.blockUser}
            onUnblockUser={socket.unblockUser}
            onClose={() => setUsersListOpen(false)}
          />
        </div>
      )}

      {/* Modals */}
      <CreateRoomModal
        open={createRoomOpen}
        onOpenChange={setCreateRoomOpen}
        onCreateRoom={socket.createRoom}
      />

      <JoinRoomModal
        open={joinRoomOpen}
        onOpenChange={setJoinRoomOpen}
        rooms={socket.rooms}
        onJoinRoom={socket.joinRoom}
      />

      {socket.currentRoom && (
        <AdminControlsModal
          open={adminControlsOpen}
          onOpenChange={setAdminControlsOpen}
          currentRoom={socket.currentRoom}
          currentUser={socket.currentUser}
          members={socket.roomMembers}
          onBlockUser={socket.blockUser}
          onUnblockUser={socket.unblockUser}
        />
      )}

      <ImagePreviewModal
        imageUrl={imagePreview}
        open={!!imagePreview}
        onOpenChange={() => setImagePreview(null)}
      />
    </div>
  );
}
