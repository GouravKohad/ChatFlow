import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { insertRoomSchema, insertUserSchema, insertMessageSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

// Setup multer for image uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

interface SocketData {
  userId?: string;
  username?: string;
  roomId?: string;
}

interface ClientSocket extends SocketData {
  id: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

    app.get('/sitemap.xml', (req: Request, res: Response) => {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
   <url>
       <loc>https://chatflow23.onrender.com/</loc>
       <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
       <changefreq>daily</changefreq>
       <priority>1.0</priority>
   </url>
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
});
  // Health check endpoint for deployment monitoring
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Serve uploaded images
  app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
  }, express.static(uploadDir));

  // Upload image endpoint
  app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
      }

      const imageUrl = `/uploads/${req.file.filename}`;
      res.json({ imageUrl });
    } catch (error) {
      res.status(500).json({ message: 'Failed to upload image' });
    }
  });

  // Get all rooms
  app.get('/api/rooms', async (req, res) => {
    try {
      const rooms = await storage.getAllRooms();
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch rooms' });
    }
  });

  // Get room messages
  app.get('/api/rooms/:roomId/messages', async (req, res) => {
    try {
      const { roomId } = req.params;
      const messages = await storage.getMessagesByRoom(roomId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  // Update message
  app.put('/api/messages/:messageId', async (req, res) => {
    try {
      const { messageId } = req.params;
      const { content } = req.body;
      
      if (!content || !content.trim()) {
        return res.status(400).json({ message: 'Content is required' });
      }

      const updatedMessage = await storage.updateMessage(messageId, content.trim());
      if (!updatedMessage) {
        return res.status(404).json({ message: 'Message not found' });
      }

      res.json(updatedMessage);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update message' });
    }
  });

  // Delete message
  app.delete('/api/messages/:messageId', async (req, res) => {
    try {
      const { messageId } = req.params;
      const deleted = await storage.deleteMessage(messageId);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Message not found' });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete message' });
    }
  });

  // Delete room
  app.delete('/api/rooms/:roomId', async (req, res) => {
    try {
      const { roomId } = req.params;
      const deleted = await storage.deleteRoom(roomId);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Room not found' });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete room' });
    }
  });

  // Socket.io server
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? [process.env.CLIENT_URL || 'https://your-app.onrender.com'] 
        : "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
  });

  const clients = new Map<string, SocketData>();

  io.on('connection', (socket) => {
    clients.set(socket.id, {});

    socket.on('message', async (message) => {
      try {
        const socketData = clients.get(socket.id) || {};

        switch (message.type) {
          case 'join':
            await handleJoin(socket, message, socketData);
            break;
          case 'create_room':
            await handleCreateRoom(socket, message, socketData);
            break;
          case 'join_room':
            await handleJoinRoom(socket, message, socketData);
            break;
          case 'leave_room':
            await handleLeaveRoom(socket, message, socketData);
            break;
          case 'send_message':
            await handleSendMessage(socket, message, socketData);
            break;
          case 'block_user':
            await handleBlockUser(socket, message, socketData);
            break;
          case 'unblock_user':
            await handleUnblockUser(socket, message, socketData);
            break;
          case 'typing':
            handleTyping(socket, message, socketData);
            break;
          case 'edit_message':
            await handleEditMessage(socket, message, socketData);
            break;
          case 'delete_message':
            await handleDeleteMessage(socket, message, socketData);
            break;
          case 'delete_room':
            await handleDeleteRoom(socket, message, socketData);
            break;
        }
      } catch (error) {
        socket.emit('message', { type: 'error', message: 'Invalid message format' });
      }
    });

    socket.on('disconnect', () => {
      const socketData = clients.get(socket.id);
      if (socketData?.userId) {
        storage.updateUser(socketData.userId, { isOnline: false });
        broadcastUserLeft(socketData);
      }
      clients.delete(socket.id);
    });
  });

  async function handleJoin(socket: any, message: any, socketData: SocketData) {
    try {
      const { username, avatar } = message;
      
      let user = await storage.getUserByUsername(username);
      if (!user) {
        user = await storage.createUser({ username, avatar });
      } else {
        await storage.updateUser(user.id, { isOnline: true, avatar });
      }

      socketData.userId = user.id;
      socketData.username = user.username;
      clients.set(socket.id, socketData);

      socket.emit('message', {
        type: 'joined',
        user: user,
        rooms: await storage.getAllRooms()
      });

    } catch (error) {
      socket.emit('message', { type: 'error', message: 'Failed to join' });
    }
  }

  async function handleCreateRoom(socket: any, message: any, socketData: SocketData) {
    try {
      if (!socketData.userId) {
        socket.emit('message', { type: 'error', message: 'Not authenticated' });
        return;
      }

      const roomData = insertRoomSchema.parse({
        name: message.name,
        description: message.description,
        isPrivate: message.isPrivate || false,
        createdBy: socketData.userId
      });

      const existingRoom = await storage.getRoomByName(roomData.name);
      if (existingRoom) {
        socket.emit('message', { type: 'error', message: 'Room name already exists' });
        return;
      }

      const room = await storage.createRoom(roomData);
      
      socket.emit('message', {
        type: 'room_created',
        room: room
      });

      // Get fresh room list and broadcast to all authenticated users
      const allRooms = await storage.getAllRooms();
      console.log(`Broadcasting room_list_updated to ${clients.size} connected clients after creating room "${room.name}"`);
      broadcastToAll({ type: 'room_list_updated', rooms: allRooms });

    } catch (error) {
      socket.emit('message', { type: 'error', message: 'Failed to create room' });
    }
  }

  async function handleJoinRoom(socket: any, message: any, socketData: SocketData) {
    try {
      if (!socketData.userId) {
        socket.emit('message', { type: 'error', message: 'Not authenticated' });
        return;
      }

      const { roomId } = message;
      const room = await storage.getRoom(roomId);
      if (!room) {
        socket.emit('message', { type: 'error', message: 'Room not found' });
        return;
      }

      if (room.blockedUsers.includes(socketData.userId)) {
        socket.emit('message', { type: 'error', message: 'You are blocked from this room' });
        return;
      }

      // Leave previous room
      if (socketData.roomId) {
        await storage.removeUserFromRoom(socketData.roomId, socketData.userId);
        broadcastToRoom(socketData.roomId, {
          type: 'user_left',
          userId: socketData.userId,
          username: socketData.username
        });
      }

      // Join new room
      await storage.addUserToRoom(roomId, socketData.userId);
      await storage.updateUser(socketData.userId, { currentRoom: roomId });
      socketData.roomId = roomId;
      clients.set(socket.id, socketData);

      const messages = await storage.getMessagesByRoom(roomId);
      const roomMembers = await getRoomMembers(roomId);

      socket.emit('message', {
        type: 'room_joined',
        room: room,
        messages: messages,
        members: roomMembers
      });

      broadcastToRoom(roomId, {
        type: 'user_joined',
        userId: socketData.userId,
        username: socketData.username
      }, socket.id);

    } catch (error) {
      socket.emit('message', { type: 'error', message: 'Failed to join room' });
    }
  }

  async function handleLeaveRoom(socket: any, message: any, socketData: SocketData) {
    if (!socketData.userId || !socketData.roomId) return;

    await storage.removeUserFromRoom(socketData.roomId, socketData.userId);
    await storage.updateUser(socketData.userId, { currentRoom: undefined });

    broadcastToRoom(socketData.roomId, {
      type: 'user_left',
      userId: socketData.userId,
      username: socketData.username
    });

    socketData.roomId = undefined;
    clients.set(socket.id, socketData);

    socket.emit('message', { type: 'room_left' });
  }

  async function handleSendMessage(socket: any, message: any, socketData: SocketData) {
    try {
      if (!socketData.userId || !socketData.roomId) {
        socket.emit('message', { type: 'error', message: 'Not in a room' });
        return;
      }

      const room = await storage.getRoom(socketData.roomId);
      if (!room) {
        socket.emit('message', { type: 'error', message: 'Room not found' });
        return;
      }

      if (room.blockedUsers.includes(socketData.userId)) {
        socket.emit('message', { type: 'error', message: 'You are blocked from sending messages' });
        return;
      }

      const user = await storage.getUser(socketData.userId);
      if (!user) return;

      const messageData = insertMessageSchema.parse({
        roomId: socketData.roomId,
        userId: socketData.userId,
        username: user.username,
        content: message.content,
        type: message.messageType || 'text',
        imageUrl: message.imageUrl,
        avatar: user.avatar
      });

      const savedMessage = await storage.createMessage(messageData);

      broadcastToRoom(socketData.roomId, {
        type: 'new_message',
        message: savedMessage
      });

    } catch (error) {
      socket.emit('message', { type: 'error', message: 'Failed to send message' });
    }
  }

  async function handleBlockUser(socket: any, message: any, socketData: SocketData) {
    try {
      if (!socketData.userId || !socketData.roomId) return;

      const room = await storage.getRoom(socketData.roomId);
      if (!room || room.createdBy !== socketData.userId) {
        socket.emit('message', { type: 'error', message: 'Not authorized' });
        return;
      }

      await storage.blockUserInRoom(socketData.roomId, message.targetUserId);

      broadcastToRoom(socketData.roomId, {
        type: 'user_blocked',
        userId: message.targetUserId
      });

    } catch (error) {
      socket.emit('message', { type: 'error', message: 'Failed to block user' });
    }
  }

  async function handleUnblockUser(socket: any, message: any, socketData: SocketData) {
    try {
      if (!socketData.userId || !socketData.roomId) return;

      const room = await storage.getRoom(socketData.roomId);
      if (!room || room.createdBy !== socketData.userId) {
        socket.emit('message', { type: 'error', message: 'Not authorized' });
        return;
      }

      await storage.unblockUserInRoom(socketData.roomId, message.targetUserId);

      broadcastToRoom(socketData.roomId, {
        type: 'user_unblocked',
        userId: message.targetUserId
      });

    } catch (error) {
      socket.emit('message', { type: 'error', message: 'Failed to unblock user' });
    }
  }

  function handleTyping(socket: any, message: any, socketData: SocketData) {
    if (!socketData.roomId) return;

    broadcastToRoom(socketData.roomId, {
      type: 'user_typing',
      userId: socketData.userId,
      username: socketData.username,
      isTyping: message.isTyping
    }, socket.id);
  }

  async function handleEditMessage(socket: any, message: any, socketData: SocketData) {
    try {
      if (!socketData.userId || !socketData.roomId) {
        socket.emit('message', { type: 'error', message: 'Not authorized' });
        return;
      }

      const { messageId, content } = message;
      
      if (!content || !content.trim()) {
        socket.emit('message', { type: 'error', message: 'Content is required' });
        return;
      }

      const existingMessage = await storage.getMessage(messageId);
      if (!existingMessage) {
        socket.emit('message', { type: 'error', message: 'Message not found' });
        return;
      }

      // Only allow editing own messages
      if (existingMessage.userId !== socketData.userId) {
        socket.emit('message', { type: 'error', message: 'You can only edit your own messages' });
        return;
      }

      const updatedMessage = await storage.updateMessage(messageId, content.trim());
      if (!updatedMessage) {
        socket.emit('message', { type: 'error', message: 'Failed to update message' });
        return;
      }

      broadcastToRoom(socketData.roomId, {
        type: 'message_edited',
        message: updatedMessage
      });

    } catch (error) {
      socket.emit('message', { type: 'error', message: 'Failed to edit message' });
    }
  }

  async function handleDeleteMessage(socket: any, message: any, socketData: SocketData) {
    try {
      if (!socketData.userId || !socketData.roomId) {
        socket.emit('message', { type: 'error', message: 'Not authorized' });
        return;
      }

      const { messageId } = message;
      
      const existingMessage = await storage.getMessage(messageId);
      if (!existingMessage) {
        socket.emit('message', { type: 'error', message: 'Message not found' });
        return;
      }

      const room = await storage.getRoom(socketData.roomId);
      if (!room) {
        socket.emit('message', { type: 'error', message: 'Room not found' });
        return;
      }

      // Allow deletion if user owns the message or is room admin
      const isOwner = existingMessage.userId === socketData.userId;
      const isAdmin = room.createdBy === socketData.userId;
      
      if (!isOwner && !isAdmin) {
        socket.emit('message', { type: 'error', message: 'You can only delete your own messages or be a room admin' });
        return;
      }

      const deleted = await storage.deleteMessage(messageId);
      if (!deleted) {
        socket.emit('message', { type: 'error', message: 'Failed to delete message' });
        return;
      }

      broadcastToRoom(socketData.roomId, {
        type: 'message_deleted',
        messageId: messageId
      });

    } catch (error) {
      socket.emit('message', { type: 'error', message: 'Failed to delete message' });
    }
  }

  async function handleDeleteRoom(socket: any, message: any, socketData: SocketData) {
    try {
      if (!socketData.userId) {
        socket.emit('message', { type: 'error', message: 'Not authorized' });
        return;
      }

      const { roomId } = message;
      
      const room = await storage.getRoom(roomId);
      if (!room) {
        socket.emit('message', { type: 'error', message: 'Room not found' });
        return;
      }

      // Only room creator can delete the room
      if (room.createdBy !== socketData.userId) {
        socket.emit('message', { type: 'error', message: 'Only room creator can delete the room' });
        return;
      }

      const deleted = await storage.deleteRoom(roomId);
      if (!deleted) {
        socket.emit('message', { type: 'error', message: 'Failed to delete room' });
        return;
      }

      // Broadcast room deletion to all users
      io.emit('message', {
        type: 'room_deleted',
        roomId: roomId
      });

    } catch (error) {
      socket.emit('message', { type: 'error', message: 'Failed to delete room' });
    }
  }

  async function getRoomMembers(roomId: string) {
    const room = await storage.getRoom(roomId);
    if (!room) return [];

    const allUsers = await storage.getAllUsers();
    return allUsers.filter(user => room.members.includes(user.id));
  }

  function broadcastToRoom(roomId: string, message: any, excludeSocketId?: string) {
    clients.forEach((socketData, socketId) => {
      if (socketData.roomId === roomId && socketId !== excludeSocketId) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('message', message);
        }
      }
    });
  }

  function broadcastToAll(message: any, excludeSocketId?: string) {
    let broadcastCount = 0;
    clients.forEach((socketData, socketId) => {
      if (socketId !== excludeSocketId && socketData.userId) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket && socket.connected) {
          socket.emit('message', message);
          broadcastCount++;
        }
      }
    });
    console.log(`Broadcasted ${message.type} to ${broadcastCount} authenticated users`);
  }

  function broadcastUserLeft(socketData: SocketData) {
    if (socketData.roomId) {
      broadcastToRoom(socketData.roomId, {
        type: 'user_left',
        userId: socketData.userId,
        username: socketData.username
      });
    }
  }

  return httpServer;
}
