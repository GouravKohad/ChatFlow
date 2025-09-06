import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
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

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

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

  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const clients = new Map<WebSocket, SocketData>();

  wss.on('connection', (ws: WebSocket) => {
    clients.set(ws, {});

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        const socketData = clients.get(ws) || {};

        switch (message.type) {
          case 'join':
            await handleJoin(ws, message, socketData);
            break;
          case 'create_room':
            await handleCreateRoom(ws, message, socketData);
            break;
          case 'join_room':
            await handleJoinRoom(ws, message, socketData);
            break;
          case 'leave_room':
            await handleLeaveRoom(ws, message, socketData);
            break;
          case 'send_message':
            await handleSendMessage(ws, message, socketData);
            break;
          case 'block_user':
            await handleBlockUser(ws, message, socketData);
            break;
          case 'unblock_user':
            await handleUnblockUser(ws, message, socketData);
            break;
          case 'typing':
            handleTyping(ws, message, socketData);
            break;
        }
      } catch (error) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      const socketData = clients.get(ws);
      if (socketData?.userId) {
        storage.updateUser(socketData.userId, { isOnline: false });
        broadcastUserLeft(socketData);
      }
      clients.delete(ws);
    });
  });

  async function handleJoin(ws: WebSocket, message: any, socketData: SocketData) {
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
      clients.set(ws, socketData);

      ws.send(JSON.stringify({
        type: 'joined',
        user: user,
        rooms: await storage.getAllRooms()
      }));

    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to join' }));
    }
  }

  async function handleCreateRoom(ws: WebSocket, message: any, socketData: SocketData) {
    try {
      if (!socketData.userId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
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
        ws.send(JSON.stringify({ type: 'error', message: 'Room name already exists' }));
        return;
      }

      const room = await storage.createRoom(roomData);
      
      ws.send(JSON.stringify({
        type: 'room_created',
        room: room
      }));

      broadcastToAll({ type: 'room_list_updated', rooms: await storage.getAllRooms() });

    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to create room' }));
    }
  }

  async function handleJoinRoom(ws: WebSocket, message: any, socketData: SocketData) {
    try {
      if (!socketData.userId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
        return;
      }

      const { roomId } = message;
      const room = await storage.getRoom(roomId);
      if (!room) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
        return;
      }

      if (room.blockedUsers.includes(socketData.userId)) {
        ws.send(JSON.stringify({ type: 'error', message: 'You are blocked from this room' }));
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
      clients.set(ws, socketData);

      const messages = await storage.getMessagesByRoom(roomId);
      const roomMembers = await getRoomMembers(roomId);

      ws.send(JSON.stringify({
        type: 'room_joined',
        room: room,
        messages: messages,
        members: roomMembers
      }));

      broadcastToRoom(roomId, {
        type: 'user_joined',
        userId: socketData.userId,
        username: socketData.username
      }, ws);

    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to join room' }));
    }
  }

  async function handleLeaveRoom(ws: WebSocket, message: any, socketData: SocketData) {
    if (!socketData.userId || !socketData.roomId) return;

    await storage.removeUserFromRoom(socketData.roomId, socketData.userId);
    await storage.updateUser(socketData.userId, { currentRoom: undefined });

    broadcastToRoom(socketData.roomId, {
      type: 'user_left',
      userId: socketData.userId,
      username: socketData.username
    });

    socketData.roomId = undefined;
    clients.set(ws, socketData);

    ws.send(JSON.stringify({ type: 'room_left' }));
  }

  async function handleSendMessage(ws: WebSocket, message: any, socketData: SocketData) {
    try {
      if (!socketData.userId || !socketData.roomId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not in a room' }));
        return;
      }

      const room = await storage.getRoom(socketData.roomId);
      if (!room) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
        return;
      }

      if (room.blockedUsers.includes(socketData.userId)) {
        ws.send(JSON.stringify({ type: 'error', message: 'You are blocked from sending messages' }));
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
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to send message' }));
    }
  }

  async function handleBlockUser(ws: WebSocket, message: any, socketData: SocketData) {
    try {
      if (!socketData.userId || !socketData.roomId) return;

      const room = await storage.getRoom(socketData.roomId);
      if (!room || room.createdBy !== socketData.userId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not authorized' }));
        return;
      }

      await storage.blockUserInRoom(socketData.roomId, message.targetUserId);

      broadcastToRoom(socketData.roomId, {
        type: 'user_blocked',
        userId: message.targetUserId
      });

    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to block user' }));
    }
  }

  async function handleUnblockUser(ws: WebSocket, message: any, socketData: SocketData) {
    try {
      if (!socketData.userId || !socketData.roomId) return;

      const room = await storage.getRoom(socketData.roomId);
      if (!room || room.createdBy !== socketData.userId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not authorized' }));
        return;
      }

      await storage.unblockUserInRoom(socketData.roomId, message.targetUserId);

      broadcastToRoom(socketData.roomId, {
        type: 'user_unblocked',
        userId: message.targetUserId
      });

    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to unblock user' }));
    }
  }

  function handleTyping(ws: WebSocket, message: any, socketData: SocketData) {
    if (!socketData.roomId) return;

    broadcastToRoom(socketData.roomId, {
      type: 'user_typing',
      userId: socketData.userId,
      username: socketData.username,
      isTyping: message.isTyping
    }, ws);
  }

  async function getRoomMembers(roomId: string) {
    const room = await storage.getRoom(roomId);
    if (!room) return [];

    const allUsers = await storage.getAllUsers();
    return allUsers.filter(user => room.members.includes(user.id));
  }

  function broadcastToRoom(roomId: string, message: any, excludeWs?: WebSocket) {
    clients.forEach((socketData, ws) => {
      if (socketData.roomId === roomId && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  function broadcastToAll(message: any, excludeWs?: WebSocket) {
    clients.forEach((socketData, ws) => {
      if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
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
