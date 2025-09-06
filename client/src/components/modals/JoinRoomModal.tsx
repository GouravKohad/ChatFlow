import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChatRoom } from '@/types/chat';

interface JoinRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rooms: ChatRoom[];
  onJoinRoom: (roomId: string) => void;
}

export default function JoinRoomModal({ open, onOpenChange, rooms, onJoinRoom }: JoinRoomModalProps) {
  const [roomName, setRoomName] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(roomName.toLowerCase())
  );

  const handleJoinByName = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomName.trim()) return;
    
    const room = rooms.find(r => r.name.toLowerCase() === roomName.toLowerCase());
    if (!room) {
      // TODO: Show error that room doesn't exist
      return;
    }
    
    setIsSubmitting(true);
    try {
      onJoinRoom(room.id);
      setRoomName('');
      setSelectedRoom(null);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinSelected = async () => {
    if (!selectedRoom) return;
    
    setIsSubmitting(true);
    try {
      onJoinRoom(selectedRoom);
      setRoomName('');
      setSelectedRoom(null);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="modal-join-room">
        <DialogHeader>
          <DialogTitle>Join Room</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <form onSubmit={handleJoinByName} className="space-y-4">
            <div>
              <Label htmlFor="room-search">Search Rooms</Label>
              <Input
                id="room-search"
                placeholder="Enter room name..."
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                data-testid="input-room-search"
              />
            </div>
          </form>
          
          {roomName && (
            <div>
              <Label>Available Rooms</Label>
              <ScrollArea className="h-48 border rounded-md p-2">
                <div className="space-y-2">
                  {filteredRooms.map((room) => (
                    <div
                      key={room.id}
                      className={`p-2 rounded cursor-pointer transition-colors ${
                        selectedRoom === room.id ? 'bg-primary/20' : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedRoom(room.id)}
                      data-testid={`room-option-${room.id}`}
                    >
                      <div className="font-medium">{room.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {room.members.length} members
                      </div>
                      {room.description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {room.description}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {filteredRooms.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      No rooms found matching "{roomName}"
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
          
          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              data-testid="button-cancel-join"
            >
              Cancel
            </Button>
            <Button
              onClick={selectedRoom ? handleJoinSelected : handleJoinByName}
              disabled={(!roomName.trim() && !selectedRoom) || isSubmitting}
              className="flex-1"
              data-testid="button-submit-join"
            >
              {isSubmitting ? 'Joining...' : 'Join Room'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
