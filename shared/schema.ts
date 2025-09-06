import { z } from "zod";

export const messageSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  userId: z.string(),
  username: z.string(),
  content: z.string(),
  type: z.enum(['text', 'image']),
  imageUrl: z.string().optional(),
  timestamp: z.date(),
  avatar: z.string().optional(),
});

export const roomSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.date(),
  isPrivate: z.boolean().default(false),
  members: z.array(z.string()),
  blockedUsers: z.array(z.string()),
});

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatar: z.string().optional(),
  isOnline: z.boolean().default(true),
  currentRoom: z.string().optional(),
});

export const insertMessageSchema = messageSchema.omit({ id: true, timestamp: true });
export const insertRoomSchema = roomSchema.omit({ id: true, createdAt: true, members: true, blockedUsers: true });
export const insertUserSchema = userSchema.omit({ id: true, isOnline: true, currentRoom: true });

export type Message = z.infer<typeof messageSchema>;
export type Room = z.infer<typeof roomSchema>;
export type User = z.infer<typeof userSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
