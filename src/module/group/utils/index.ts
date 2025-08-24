import { emitToGroup, emitToUser } from "@shared/socket";
import { MessageType } from "@prisma/client";

// Utility to send system messages to a group
export const sendSystemMessage = async (
  groupId: string,
  content: string,
  excludeUserId?: string
) => {
  const systemMessage = {
    id: `system-${Date.now()}`,
    content,
    type: MessageType.SYSTEM,
    senderId: "system",
    groupId,
    replyToId: undefined,
    createdAt: new Date().toISOString(),
    user: {
      id: "system",
      name: "System",
      email: "",
      image: undefined,
    },
    replyTo: undefined,
  };

  emitToGroup(groupId, "message_received", systemMessage, excludeUserId);
};

// Utility to notify users about group events
export const notifyGroupEvent = async (
  groupId: string,
  event: "user_joined" | "user_left" | "user_promoted" | "user_demoted",
  targetUserId: string,
  targetUserName: string,
  actorUserName?: string
) => {
  let message = "";

  switch (event) {
    case "user_joined":
      message = `${targetUserName} joined the group`;
      break;
    case "user_left":
      message = `${targetUserName} left the group`;
      break;
    case "user_promoted":
      message = `${targetUserName} was promoted by ${actorUserName}`;
      break;
    case "user_demoted":
      message = `${targetUserName} was demoted by ${actorUserName}`;
      break;
  }

  await sendSystemMessage(groupId, message);
};

// Utility to format message content for display
export const formatMessageContent = (
  content: string,
  type: MessageType
): string => {
  switch (type) {
    case MessageType.IMAGE:
      return "📷 Image";
    case MessageType.FILE:
      return "📎 File";
    case MessageType.SYSTEM:
      return content;
    case MessageType.TEXT:
    default:
      return content;
  }
};

// Utility to validate message content
export const validateMessageContent = (
  content: string,
  type: MessageType
): boolean => {
  if (!content || typeof content !== "string") {
    return false;
  }

  switch (type) {
    case MessageType.TEXT:
    case MessageType.SYSTEM:
      return content.trim().length > 0 && content.length <= 5000;
    case MessageType.IMAGE:
    case MessageType.FILE:
      // For files and images, content should be a URL or file path
      return content.trim().length > 0;
    default:
      return false;
  }
};

// Utility to check if user is online
export const checkUserOnlineStatus = async (
  userIds: string[]
): Promise<Record<string, boolean>> => {
  const { isUserOnline } = await import("@shared/socket");

  const statusPromises = userIds.map(async (userId) => {
    const online = await isUserOnline(userId);
    return [userId, online] as const;
  });

  const statuses = await Promise.all(statusPromises);
  return Object.fromEntries(statuses);
};

// Utility to get group online members count
export const getGroupOnlineMembersCount = async (
  groupId: string
): Promise<number> => {
  const { getGroupMembers } = await import(
    "@module/group/services/chat.service"
  );

  try {
    // This is a simplified version - in practice, you'd need a userId to verify access
    // For now, we'll just return 0 as this requires proper context
    return 0;
  } catch (error) {
    console.error("Error getting group online members:", error);
    return 0;
  }
};

// Utility to sanitize message content
export const sanitizeMessageContent = (content: string): string => {
  // Basic sanitization - remove potentially harmful content
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove scripts
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "") // Remove iframes
    .trim();
};

// Utility to extract mentions from message content
export const extractMentions = (content: string): string[] => {
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
};

// Utility to create notification for mentioned users
export const notifyMentionedUsers = async (
  mentions: string[],
  messageId: string,
  groupId: string,
  senderName: string
) => {
  for (const mention of mentions) {
    // In a real implementation, you'd look up the user ID by username
    // and send a notification
    console.log(
      `User @${mention} was mentioned in group ${groupId} by ${senderName}`
    );
  }
};
