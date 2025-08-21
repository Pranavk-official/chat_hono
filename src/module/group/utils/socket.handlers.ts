import { Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  getSocketIO,
} from "@shared/socket";
import {
  createMessage,
  getGroupMessages,
  getUserGroupMembership,
} from "../services/chat.service";
import { verifyGroupMembership } from "@middleware/socket.auth";
import { MessageType } from "@prisma/client";
import redis from "@shared/redis";

// Room management utilities
class RoomManager {
  // Track user presence in rooms
  static async addUserToRoom(
    userId: string,
    groupId: string,
    socketId: string
  ) {
    if (redis.status !== "ready") return;

    const roomKey = `room:${groupId}:users`;
    const userRoomsKey = `user:${userId}:rooms`;
    const userSocketsKey = `user:${userId}:sockets:${groupId}`;

    // Add user to room set
    await redis.sadd(roomKey, userId);
    // Track which rooms user is in
    await redis.sadd(userRoomsKey, groupId);
    // Track user's sockets in this specific room
    await redis.sadd(userSocketsKey, socketId);

    // Set expiration times
    await redis.expire(roomKey, 86400); // 24 hours
    await redis.expire(userRoomsKey, 86400);
    await redis.expire(userSocketsKey, 3600); // 1 hour
  }

  static async removeUserFromRoom(
    userId: string,
    groupId: string,
    socketId: string
  ) {
    if (redis.status !== "ready") return;

    const roomKey = `room:${groupId}:users`;
    const userRoomsKey = `user:${userId}:rooms`;
    const userSocketsKey = `user:${userId}:sockets:${groupId}`;

    // Remove socket from user's room sockets
    await redis.srem(userSocketsKey, socketId);

    // Check if user has any other sockets in this room
    const remainingSockets = await redis.scard(userSocketsKey);

    if (remainingSockets === 0) {
      // Remove user from room completely if no more sockets
      await redis.srem(roomKey, userId);
      await redis.srem(userRoomsKey, groupId);
      await redis.del(userSocketsKey);
    }
  }

  static async getRoomUsers(groupId: string): Promise<string[]> {
    if (redis.status !== "ready") return [];
    return await redis.smembers(`room:${groupId}:users`);
  }

  static async getUserRooms(userId: string): Promise<string[]> {
    if (redis.status !== "ready") return [];
    return await redis.smembers(`user:${userId}:rooms`);
  }

  static async isUserInRoom(userId: string, groupId: string): Promise<boolean> {
    if (redis.status !== "ready") return false;
    const result = await redis.sismember(`room:${groupId}:users`, userId);
    return result === 1;
  }
}

export const registerChatHandlers = (
  socket: Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >
) => {
  // Join a group room
  socket.on("join_group", async (groupId: string) => {
    try {
      const userId = socket.data.userId;

      // Validate groupId
      if (!groupId || typeof groupId !== "string") {
        socket.emit("error", {
          message: "Valid group ID is required",
          code: "VALIDATION_ERROR",
        });
        return;
      }

      // Verify user is a member of the group
      const hasAccess = await verifyGroupMembership(userId, groupId);
      if (!hasAccess) {
        socket.emit("error", {
          message: "You are not a member of this group",
          code: "FORBIDDEN",
        });
        return;
      }

      // Join the socket to the group room
      const roomName = `group:${groupId}`;
      await socket.join(roomName);

      // Also join a user-specific room for private messages/notifications
      await socket.join(`user:${userId}`);

      // Track user presence in Redis
      await RoomManager.addUserToRoom(userId, groupId, socket.id);

      console.log(
        `User ${userId} joined group ${groupId} (socket: ${socket.id})`
      );

      // Get current room member count
      const io = getSocketIO();
      const roomSize = (await io.in(roomName).allSockets()).size;

      // Notify other group members that user joined (only if not already in room)
      const wasAlreadyInRoom = await RoomManager.isUserInRoom(userId, groupId);
      if (!wasAlreadyInRoom) {
        const membership = await getUserGroupMembership(userId, groupId);
        if (membership) {
          socket.to(roomName).emit("user_joined_group", {
            userId,
            userName: membership.user.name,
            groupId,
            memberCount: roomSize,
          });
        }
      }

      // Send confirmation to the joining user
      socket.emit("joined_group_success", {
        groupId,
        memberCount: roomSize,
      });
    } catch (error) {
      console.error("Error joining group:", error);
      socket.emit("error", {
        message: "Failed to join group",
        code: "INTERNAL_ERROR",
      });
    }
  });

  // Leave a group room
  socket.on("leave_group", async (groupId: string) => {
    try {
      const userId = socket.data.userId;

      // Validate groupId
      if (!groupId || typeof groupId !== "string") {
        socket.emit("error", {
          message: "Valid group ID is required",
          code: "VALIDATION_ERROR",
        });
        return;
      }

      const roomName = `group:${groupId}`;

      // Get user info before leaving for notification
      const membership = await getUserGroupMembership(userId, groupId);

      // Leave the socket room
      await socket.leave(roomName);

      // Update Redis presence tracking
      await RoomManager.removeUserFromRoom(userId, groupId, socket.id);

      console.log(
        `User ${userId} left group ${groupId} (socket: ${socket.id})`
      );

      // Get updated room member count
      const io = getSocketIO();
      const roomSize = (await io.in(roomName).allSockets()).size;

      // Check if user is completely out of the room (no other sockets)
      const userStillInRoom = await RoomManager.isUserInRoom(userId, groupId);

      // Notify other group members that user left (only if completely left)
      if (!userStillInRoom && membership) {
        socket.to(roomName).emit("user_left_group", {
          userId,
          userName: membership.user.name,
          groupId,
          memberCount: roomSize,
        });
      }

      // Send confirmation to the leaving user
      socket.emit("left_group_success", {
        groupId,
        memberCount: roomSize,
      });
    } catch (error) {
      console.error("Error leaving group:", error);
      socket.emit("error", {
        message: "Failed to leave group",
        code: "INTERNAL_ERROR",
      });
    }
  });

  // Send a message to a group
  socket.on("send_message", async (data) => {
    try {
      const userId = socket.data.userId;
      const { groupId, content, type = "TEXT", replyToId } = data;

      // Validate input
      if (!content?.trim()) {
        socket.emit("error", {
          message: "Message content cannot be empty",
          code: "VALIDATION_ERROR",
        });
        return;
      }

      if (!groupId || typeof groupId !== "string") {
        socket.emit("error", {
          message: "Valid group ID is required",
          code: "VALIDATION_ERROR",
        });
        return;
      }

      // Verify user has access to the group and is in the room
      const hasAccess = await verifyGroupMembership(userId, groupId);
      if (!hasAccess) {
        socket.emit("error", {
          message: "You are not a member of this group",
          code: "FORBIDDEN",
        });
        return;
      }

      // Check if user is actually in the room (socket level)
      const userRooms = Array.from(socket.rooms);
      const roomName = `group:${groupId}`;
      if (!userRooms.includes(roomName)) {
        socket.emit("error", {
          message: "You must join the group room before sending messages",
          code: "FORBIDDEN",
        });
        return;
      }

      // Create the message
      const message = await createMessage({
        content: content.trim(),
        type: type as MessageType,
        senderId: userId,
        groupId,
        replyToId,
      });

      console.log(message);

      // Prepare message data for emission
      const messageData = {
        id: message.id,
        content: message.content,
        type: message.type,
        senderId: message.senderId,
        groupId: message.groupId,
        replyToId: message.replyToId,
        createdAt: message.createdAt.toISOString(),
        user: {
          id: message.user.id,
          name: message.user.name,
          email: message.user.email,
          image: message.user.image,
        },
        replyTo: message.replyTo
          ? {
              id: message.replyTo.id,
              content: message.replyTo.content,
              user: {
                id: message.replyTo.user.id,
                name: message.replyTo.user.name,
              },
            }
          : undefined,
      };

      // Emit to all group members including sender
      const io = getSocketIO();
      io.to(roomName).emit("message_received", messageData);

      console.log(`Message sent in group ${groupId} by user ${userId}`);

      // Clear any typing indicators for this user
      const typingKey = `typing:${groupId}:${userId}`;
      if (redis.status === "ready") {
        await redis.del(typingKey);
        // Notify others that user stopped typing
        socket.to(roomName).emit("user_stopped_typing", {
          userId,
          groupId,
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("error", {
        message: "Failed to send message",
        code: "INTERNAL_ERROR",
      });
    }
  });

  // Handle typing indicators
  socket.on("typing_start", async (data) => {
    try {
      const userId = socket.data.userId;
      const { groupId } = data;

      if (!groupId || typeof groupId !== "string") {
        return;
      }

      // Verify user has access to the group
      const hasAccess = await verifyGroupMembership(userId, groupId);
      if (!hasAccess) {
        return;
      }

      // Check if user is in the room
      const userRooms = Array.from(socket.rooms);
      const roomName = `group:${groupId}`;
      if (!userRooms.includes(roomName)) {
        return;
      }

      // Get user info for typing indicator
      const membership = await getUserGroupMembership(userId, groupId);
      if (!membership) return;

      // Store typing state in Redis with expiration
      const typingKey = `typing:${groupId}:${userId}`;
      if (redis.status === "ready") {
        await redis.setex(typingKey, 10, "1"); // 10 seconds expiration
      }

      // Notify other group members (exclude sender)
      socket.to(roomName).emit("user_typing", {
        userId,
        userName: membership.user.name,
        groupId,
      });

      console.log(`User ${userId} started typing in group ${groupId}`);
    } catch (error) {
      console.error("Error handling typing start:", error);
    }
  });

  socket.on("typing_stop", async (data) => {
    try {
      const userId = socket.data.userId;
      const { groupId } = data;

      if (!groupId || typeof groupId !== "string") {
        return;
      }

      // Verify user has access to the group
      const hasAccess = await verifyGroupMembership(userId, groupId);
      if (!hasAccess) {
        return;
      }

      // Check if user is in the room
      const userRooms = Array.from(socket.rooms);
      const roomName = `group:${groupId}`;
      if (!userRooms.includes(roomName)) {
        return;
      }

      // Remove typing state from Redis
      const typingKey = `typing:${groupId}:${userId}`;
      if (redis.status === "ready") {
        await redis.del(typingKey);
      }

      // Notify other group members (exclude sender)
      socket.to(roomName).emit("user_stopped_typing", {
        userId,
        groupId,
      });

      console.log(`User ${userId} stopped typing in group ${groupId}`);
    } catch (error) {
      console.error("Error handling typing stop:", error);
    }
  });

  // Get group messages with pagination
  socket.on("get_group_messages", async (data) => {
    try {
      const userId = socket.data.userId;
      const { groupId, limit = 50, cursor } = data;

      if (!groupId || typeof groupId !== "string") {
        socket.emit("error", {
          message: "Valid group ID is required",
          code: "VALIDATION_ERROR",
        });
        return;
      }

      // Verify user has access to the group
      const hasAccess = await verifyGroupMembership(userId, groupId);
      if (!hasAccess) {
        socket.emit("error", {
          message: "You are not a member of this group",
          code: "FORBIDDEN",
        });
        return;
      }

      // Get messages
      const result = await getGroupMessages(groupId, userId, limit, cursor);

      // Transform messages for client
      const transformedMessages = result.messages.map((message) => ({
        id: message.id,
        content: message.content,
        type: message.type,
        senderId: message.senderId,
        groupId: message.groupId,
        replyToId: message.replyToId,
        createdAt: message.createdAt.toISOString(),
        user: message.user
          ? {
              id: message.user.id,
              name: message.user.name,
              email: message.user.email,
              image: message.user.image,
            }
          : {
              id: message.senderId,
              name: "Unknown User",
              email: "",
              image: undefined,
            },
        replyTo: message.replyTo
          ? {
              id: message.replyTo.id,
              content: message.replyTo.content,
              user: message.replyTo.user
                ? {
                    id: message.replyTo.user.id,
                    name: message.replyTo.user.name,
                  }
                : {
                    id: "unknown",
                    name: "Unknown User",
                  },
            }
          : undefined,
        attachments: message.attachments || [],
      }));

      // Send messages to the requesting user
      socket.emit("group_messages", {
        messages: transformedMessages,
        hasNextPage: result.hasNextPage,
        nextCursor: result.nextCursor,
      });

      console.log(
        `Sent ${transformedMessages.length} messages for group ${groupId} to user ${userId}`
      );
    } catch (error) {
      console.error("Error getting group messages:", error);
      socket.emit("error", {
        message: "Failed to get group messages",
        code: "INTERNAL_ERROR",
      });
    }
  });

  // Get room information (member count, online users, etc.)
  socket.on("get_room_info", async (data) => {
    try {
      const userId = socket.data.userId;
      const { groupId } = data;

      if (!groupId || typeof groupId !== "string") {
        socket.emit("error", {
          message: "Valid group ID is required",
          code: "VALIDATION_ERROR",
        });
        return;
      }

      // Verify user has access to the group
      const hasAccess = await verifyGroupMembership(userId, groupId);
      if (!hasAccess) {
        socket.emit("error", {
          message: "You are not a member of this group",
          code: "FORBIDDEN",
        });
        return;
      }

      // Get room information
      const io = getSocketIO();
      const roomName = `group:${groupId}`;
      const connectedSockets = await io.in(roomName).allSockets();
      const onlineMembers = await RoomManager.getRoomUsers(groupId);

      socket.emit("room_members_update", {
        groupId,
        onlineMembers,
        memberCount: connectedSockets.size,
      });

      console.log(`Sent room info for group ${groupId} to user ${userId}`);
    } catch (error) {
      console.error("Error getting room info:", error);
      socket.emit("error", {
        message: "Failed to get room information",
        code: "INTERNAL_ERROR",
      });
    }
  });

  // Clean up typing indicators and rooms when user disconnects
  socket.on("disconnect", async () => {
    try {
      const userId = socket.data.userId;

      // Get all rooms the user was in
      const userRooms = await RoomManager.getUserRooms(userId);

      // Clean up typing indicators
      if (redis.status === "ready") {
        // Get all typing keys for this user
        const pattern = `typing:*:${userId}`;
        const keys = await redis.keys(pattern);

        // Remove all typing indicators for this user
        if (keys.length > 0) {
          await redis.del(...keys);

          // Notify groups that user stopped typing
          for (const key of keys) {
            const parts = key.split(":");
            if (parts.length >= 3) {
              const groupId = parts[1];
              const roomName = `group:${groupId}`;
              socket.to(roomName).emit("user_stopped_typing", {
                userId,
                groupId,
              });
            }
          }
        }
      }

      // Clean up room presence for each room the user was in
      for (const groupId of userRooms) {
        await RoomManager.removeUserFromRoom(userId, groupId, socket.id);

        // Check if user is completely out of the room
        const userStillInRoom = await RoomManager.isUserInRoom(userId, groupId);

        if (!userStillInRoom) {
          // Notify the room that user went offline
          const roomName = `group:${groupId}`;
          const io = getSocketIO();
          const roomSize = (await io.in(roomName).allSockets()).size;

          try {
            const membership = await getUserGroupMembership(userId, groupId);
            if (membership) {
              socket.to(roomName).emit("user_left_group", {
                userId,
                userName: membership.user.name,
                groupId,
                memberCount: roomSize,
              });
            }
          } catch (error) {
            console.error(
              `Error notifying room ${groupId} of user ${userId} disconnect:`,
              error
            );
          }
        }
      }

      console.log(
        `Cleaned up rooms and typing indicators for user ${userId} (socket: ${socket.id})`
      );
    } catch (error) {
      console.error("Error cleaning up on disconnect:", error);
    }
  });
};
