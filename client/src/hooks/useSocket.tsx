import { useEffect, useRef, useState, useCallback } from 'react';
import { ChatUser, ChatRoom, ChatMessage, TypingUser } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';

interface SocketState {
  isConnected: boolean;
  currentUser: ChatUser | null;
  currentRoom: ChatRoom | null;
  rooms: ChatRoom[];
  messages: ChatMessage[];
  roomMembers: ChatUser[];
  typingUsers: TypingUser[];
}

export function useSocket() {
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  const [state, setState] = useState<SocketState>({
    isConnected: false,
    currentUser: null,
    currentRoom: null,
    rooms: [],
    messages: [],
    roomMembers: [],
    typingUsers: [],
  });

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setState(prev => ({ ...prev, isConnected: true }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleSocketMessage(data);
      } catch (error) {
        console.error('Failed to parse socket message:', error);
      }
    };

    socket.onclose = () => {
      setState(prev => ({ ...prev, isConnected: false }));
      // Attempt to reconnect after 3 seconds
      setTimeout(connect, 3000);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to chat server",
        variant: "destructive",
      });
    };
  }, [toast]);

  const handleSocketMessage = (data: any) => {
    switch (data.type) {
      case 'joined':
        setState(prev => ({
          ...prev,
          currentUser: data.user,
          rooms: data.rooms.map((room: any) => ({
            ...room,
            createdAt: new Date(room.createdAt)
          })),
        }));
        break;

      case 'room_created':
        setState(prev => ({
          ...prev,
          rooms: [...prev.rooms, {
            ...data.room,
            createdAt: new Date(data.room.createdAt)
          }],
        }));
        toast({
          title: "Room Created",
          description: `Room "${data.room.name}" has been created`,
        });
        break;

      case 'room_joined':
        setState(prev => ({
          ...prev,
          currentRoom: {
            ...data.room,
            createdAt: new Date(data.room.createdAt)
          },
          messages: data.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })),
          roomMembers: data.members,
        }));
        break;

      case 'room_left':
        setState(prev => ({
          ...prev,
          currentRoom: null,
          messages: [],
          roomMembers: [],
          typingUsers: [],
        }));
        break;

      case 'new_message':
        setState(prev => ({
          ...prev,
          messages: [...prev.messages, {
            ...data.message,
            timestamp: new Date(data.message.timestamp)
          }],
        }));
        break;

      case 'user_joined':
        setState(prev => ({
          ...prev,
          roomMembers: prev.roomMembers.some(m => m.id === data.userId) 
            ? prev.roomMembers 
            : [...prev.roomMembers, { 
                id: data.userId, 
                username: data.username, 
                isOnline: true 
              }],
        }));
        toast({
          title: "User Joined",
          description: `${data.username} joined the room`,
        });
        break;

      case 'user_left':
        setState(prev => ({
          ...prev,
          roomMembers: prev.roomMembers.filter(m => m.id !== data.userId),
          typingUsers: prev.typingUsers.filter(t => t.userId !== data.userId),
        }));
        break;

      case 'user_typing':
        setState(prev => {
          const filtered = prev.typingUsers.filter(t => t.userId !== data.userId);
          return {
            ...prev,
            typingUsers: data.isTyping 
              ? [...filtered, { userId: data.userId, username: data.username }]
              : filtered,
          };
        });
        break;

      case 'user_blocked':
        setState(prev => ({
          ...prev,
          roomMembers: prev.roomMembers.filter(m => m.id !== data.userId),
        }));
        toast({
          title: "User Blocked",
          description: "User has been blocked from the room",
        });
        break;

      case 'user_unblocked':
        toast({
          title: "User Unblocked",
          description: "User has been unblocked",
        });
        break;

      case 'room_list_updated':
        setState(prev => ({
          ...prev,
          rooms: data.rooms.map((room: any) => ({
            ...room,
            createdAt: new Date(room.createdAt)
          })),
        }));
        break;

      case 'error':
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
        break;
    }
  };

  const sendMessage = useCallback((type: string, payload: any = {}) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, ...payload }));
    }
  }, []);

  const joinChat = useCallback((username: string, avatar?: string) => {
    sendMessage('join', { username, avatar });
  }, [sendMessage]);

  const createRoom = useCallback((name: string, description?: string, isPrivate = false) => {
    sendMessage('create_room', { name, description, isPrivate });
  }, [sendMessage]);

  const joinRoom = useCallback((roomId: string) => {
    sendMessage('join_room', { roomId });
  }, [sendMessage]);

  const leaveRoom = useCallback(() => {
    sendMessage('leave_room');
  }, [sendMessage]);

  const sendChatMessage = useCallback((content: string, messageType = 'text', imageUrl?: string) => {
    sendMessage('send_message', { content, messageType, imageUrl });
  }, [sendMessage]);

  const blockUser = useCallback((targetUserId: string) => {
    sendMessage('block_user', { targetUserId });
  }, [sendMessage]);

  const unblockUser = useCallback((targetUserId: string) => {
    sendMessage('unblock_user', { targetUserId });
  }, [sendMessage]);

  const setTyping = useCallback((isTyping: boolean) => {
    sendMessage('typing', { isTyping });
  }, [sendMessage]);

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  return {
    ...state,
    joinChat,
    createRoom,
    joinRoom,
    leaveRoom,
    sendChatMessage,
    blockUser,
    unblockUser,
    setTyping,
  };
}
