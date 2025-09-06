import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
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
  const socketRef = useRef<Socket | null>(null);
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
    if (socketRef.current?.connected) return;

    // Get the current hostname and protocol for production deployments
    const getSocketUrl = () => {
      if (typeof window !== 'undefined') {
        const { protocol, hostname, port } = window.location;
        const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';
        
        if (isLocalDev) {
          // In development, connect to the same port
          return `${protocol}//${hostname}:${port}`;
        } else {
          // In production, connect to the same origin
          return `${protocol}//${hostname}`;
        }
      }
      return undefined;
    };

    const socketUrl = getSocketUrl();
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'], // Enable both transports for better compatibility
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setState(prev => ({ ...prev, isConnected: true }));
    });

    socket.on('message', (data) => {
      handleSocketMessage(data);
    });

    socket.on('disconnect', () => {
      setState(prev => ({ ...prev, isConnected: false }));
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.io connection error:', error);
      toast({
        title: "Connection Error",
        description: "Unable to connect to chat server. Please check your internet connection.",
        variant: "destructive",
      });
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected to server after', attemptNumber, 'attempts');
      toast({
        title: "Reconnected",
        description: "Successfully reconnected to chat server",
      });
    });

    socket.on('reconnect_error', (error) => {
      console.error('Reconnection failed:', error);
    });

    socket.on('reconnect_failed', () => {
      toast({
        title: "Connection Failed", 
        description: "Unable to reconnect to chat server. Please refresh the page.",
        variant: "destructive",
      });
    });
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

      case 'message_edited':
        setState(prev => ({
          ...prev,
          messages: prev.messages.map(msg => 
            msg.id === data.message.id 
              ? { ...data.message, timestamp: new Date(data.message.timestamp) }
              : msg
          ),
        }));
        break;

      case 'message_deleted':
        setState(prev => ({
          ...prev,
          messages: prev.messages.filter(msg => msg.id !== data.messageId),
        }));
        break;

      case 'room_deleted':
        setState(prev => ({
          ...prev,
          rooms: prev.rooms.filter(room => room.id !== data.roomId),
          currentRoom: prev.currentRoom?.id === data.roomId ? null : prev.currentRoom,
          messages: prev.currentRoom?.id === data.roomId ? [] : prev.messages,
          roomMembers: prev.currentRoom?.id === data.roomId ? [] : prev.roomMembers,
        }));
        toast({
          title: "Room Deleted",
          description: "The room has been deleted",
          variant: "destructive",
        });
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
    if (socketRef.current?.connected) {
      socketRef.current.emit('message', { type, ...payload });
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

  const editMessage = useCallback((messageId: string, content: string) => {
    sendMessage('edit_message', { messageId, content });
  }, [sendMessage]);

  const deleteMessage = useCallback((messageId: string) => {
    sendMessage('delete_message', { messageId });
  }, [sendMessage]);

  const deleteRoom = useCallback((roomId: string) => {
    sendMessage('delete_room', { roomId });
  }, [sendMessage]);

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
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
    editMessage,
    deleteMessage,
    deleteRoom,
  };
}
