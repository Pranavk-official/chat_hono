import { z } from "zod";
import { MessageType } from "@prisma/client";

// Message creation schema
export const createMessageSchema = z.object({
  content: z.string().min(1, "Message content cannot be empty").max(5000, "Message too long"),
  type: z.nativeEnum(MessageType).default(MessageType.TEXT),
  groupId: z.string().cuid("Invalid group ID"),
  replyToId: z.string().cuid("Invalid reply message ID").optional(),
});

// Message update schema (only content can be updated)
export const updateMessageSchema = z.object({
  content: z.string().min(1, "Message content cannot be empty").max(5000, "Message too long"),
});

// Get messages schema (for query params)
export const getMessagesSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  cursor: z.string().cuid().optional(),
});

// Group member management schemas
export const addMemberSchema = z.object({
  userId: z.string().cuid("Invalid user ID"),
  role: z.enum(["MEMBER", "ADMIN"]).default("MEMBER"),
});

export const removeMemberSchema = z.object({
  userId: z.string().cuid("Invalid user ID"),
});

// Socket event schemas
export const joinGroupSchema = z.object({
  groupId: z.string().cuid("Invalid group ID"),
});

export const sendMessageSocketSchema = z.object({
  groupId: z.string().cuid("Invalid group ID"),
  content: z.string().min(1, "Message content cannot be empty").max(5000, "Message too long"),
  type: z.nativeEnum(MessageType).optional(),
  replyToId: z.string().cuid("Invalid reply message ID").optional(),
});

export const typingEventSchema = z.object({
  groupId: z.string().cuid("Invalid group ID"),
});

export const getGroupMessagesSocketSchema = z.object({
  groupId: z.string().cuid("Invalid group ID"),
  limit: z.number().min(1).max(100).optional(),
  cursor: z.string().cuid().optional(),
});

// File upload schema
export const uploadAttachmentSchema = z.object({
  messageId: z.string().cuid("Invalid message ID"),
  filename: z.string().optional(),
  mimeType: z.string().optional(),
});

// Response types
export type CreateMessageRequest = z.infer<typeof createMessageSchema>;
export type UpdateMessageRequest = z.infer<typeof updateMessageSchema>;
export type GetMessagesRequest = z.infer<typeof getMessagesSchema>;
export type AddMemberRequest = z.infer<typeof addMemberSchema>;
export type RemoveMemberRequest = z.infer<typeof removeMemberSchema>;
export type JoinGroupRequest = z.infer<typeof joinGroupSchema>;
export type SendMessageSocketRequest = z.infer<typeof sendMessageSocketSchema>;
export type TypingEventRequest = z.infer<typeof typingEventSchema>;
export type GetGroupMessagesSocketRequest = z.infer<typeof getGroupMessagesSocketSchema>;
export type UploadAttachmentRequest = z.infer<typeof uploadAttachmentSchema>;
