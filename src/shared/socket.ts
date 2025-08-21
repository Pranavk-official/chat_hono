import { Server as SocketIOServer } from "socket.io";
import { createServer } from "http";
import { verifyToken } from "@utils/jwt";
import { UnauthorizedError } from "@shared/error";
import { registerChatHandlers } from "@module/group/utils/socket.handlers";
import redis from "@shared/redis";

export interface SocketData {
  userId: string;
  email?: string;
  emailVerified: boolean;
}

export interface ClientToServerEvents {
  join_group: (groupId: string) => void;
  leave_group: (groupId: string) => void;
  send_message: (data: {
    groupId: string;
    content: string;
    type?: "TEXT" | "IMAGE" | "FILE";
    replyToId?: string;
  }) => void;
  typing_start: (data: { groupId: string }) => void;
  typing_stop: (data: { groupId: string }) => void;
  get_group_messages: (data: {
    groupId: string;
    limit?: number;
    cursor?: string;
  }) => void;
  get_room_info: (data: { groupId: string }) => void;
}

export interface ServerToClientEvents {
  message_received: (data: {
    id: string;
    content: string;
    type: "TEXT" | "IMAGE" | "FILE" | "SYSTEM";
    senderId: string;
    groupId: string;
    replyToId?: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
    };
    replyTo?: {
      id: string;
      content: string;
      user: {
        id: string;
        name: string;
      };
    };
  }) => void;
  user_typing: (data: {
    userId: string;
    userName: string;
    groupId: string;
  }) => void;
  user_stopped_typing: (data: { userId: string; groupId: string }) => void;
  group_messages: (data: {
    messages: any[];
    hasNextPage: boolean;
    nextCursor?: string;
  }) => void;
  error: (data: { message: string; code?: string }) => void;
  user_joined_group: (data: {
    userId: string;
    userName: string;
    groupId: string;
    memberCount?: number;
  }) => void;
  user_left_group: (data: {
    userId: string;
    userName: string;
    groupId: string;
    memberCount?: number;
  }) => void;
  joined_group_success: (data: {
    groupId: string;
    memberCount: number;
  }) => void;
  left_group_success: (data: { groupId: string; memberCount: number }) => void;
  room_members_update: (data: {
    groupId: string;
    onlineMembers: string[];
    memberCount: number;
  }) => void;
}

export interface InterServerEvents {
  // For scaling with multiple server instances
}

let io: SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
> | null = null;

export const initializeSocket = (server: any) => {
  io = new SocketIOServer(server, {
    path: "/socket.io",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(" ")[1];

      if (!token) {
        return next(new UnauthorizedError("Authentication token required"));
      }

      const decoded = verifyToken(token);

      if (decoded.type !== "access") {
        return next(new UnauthorizedError("Invalid token type"));
      }

      // Store user data in socket
      socket.data = {
        userId: decoded.id,
        email: decoded.email,
        emailVerified: decoded.emailVerified,
      };

      // Track user connection in Redis for presence
      if (redis.status === "ready") {
        await redis.sadd(`user:${decoded.id}:sockets`, socket.id);
        await redis.expire(`user:${decoded.id}:sockets`, 3600); // 1 hour expiry
      }

      next();
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(new UnauthorizedError("Invalid authentication token"));
    }
  });

  // Handle connection
  io.on("connection", (socket) => {
    console.log(`User ${socket.data.userId} connected: ${socket.id}`);

    // Handle disconnection
    socket.on("disconnect", async (reason) => {
      console.log(
        `User ${socket.data.userId} disconnected: ${socket.id} (${reason})`
      );

      // Remove socket from user's active sockets
      if (redis.status === "ready") {
        await redis.srem(`user:${socket.data.userId}:sockets`, socket.id);
      }
    });

    registerChatHandlers(socket);
  });

  console.log("Socket.IO server initialized");
  return io;
};

export const getSocketIO = () => {
  if (!io) {
    throw new Error(
      "Socket.IO server not initialized. Call initializeSocket() first."
    );
  }
  return io;
};

// Utility functions for presence and notification
export const getUserSocketCount = async (userId: string): Promise<number> => {
  if (redis.status !== "ready") return 0;
  return await redis.scard(`user:${userId}:sockets`);
};

export const isUserOnline = async (userId: string): Promise<boolean> => {
  const socketCount = await getUserSocketCount(userId);
  return socketCount > 0;
};

export const emitToUser = async (
  userId: string,
  event: keyof ServerToClientEvents,
  data: any
) => {
  if (!io) return;

  if (redis.status === "ready") {
    const sockets = await redis.smembers(`user:${userId}:sockets`);
    sockets.forEach((socketId) => {
      io?.to(socketId).emit(event, data);
    });
  }
};

export const emitToGroup = (
  groupId: string,
  event: keyof ServerToClientEvents,
  data: any,
  excludeUserId?: string
) => {
  if (!io) return;

  const roomName = `group:${groupId}`;
  if (excludeUserId) {
    // Emit to all in group except the excluded user
    io.to(roomName).except(`user:${excludeUserId}`).emit(event, data);
  } else {
    io.to(roomName).emit(event, data);
  }
};

// Enhanced room management utilities
export const getRoomMembers = async (groupId: string): Promise<string[]> => {
  if (!io) return [];

  const roomName = `group:${groupId}`;
  const sockets = await io.in(roomName).fetchSockets();

  // Get unique user IDs from connected sockets
  const userIds = new Set<string>();
  sockets.forEach((socket) => {
    if (socket.data?.userId) {
      userIds.add(socket.data.userId);
    }
  });

  return Array.from(userIds);
};

export const getRoomSocketCount = async (groupId: string): Promise<number> => {
  if (!io) return 0;

  const roomName = `group:${groupId}`;
  const sockets = await io.in(roomName).allSockets();
  return sockets.size;
};

export const notifyRoomMembersUpdate = async (groupId: string) => {
  if (!io) return;

  try {
    const roomName = `group:${groupId}`;
    const memberIds = await getRoomMembers(groupId);
    const socketCount = await getRoomSocketCount(groupId);

    io.to(roomName).emit("room_members_update", {
      groupId,
      onlineMembers: memberIds,
      memberCount: socketCount,
    });
  } catch (error) {
    console.error(`Error notifying room ${groupId} members update:`, error);
  }
};

// Check if a specific user is in a room
export const isUserInRoom = async (
  userId: string,
  groupId: string
): Promise<boolean> => {
  if (!io) return false;

  const roomName = `group:${groupId}`;
  const sockets = await io.in(roomName).fetchSockets();

  return sockets.some((socket) => socket.data?.userId === userId);
};

// Force disconnect all user's sockets from a room
export const disconnectUserFromRoom = async (
  userId: string,
  groupId: string
) => {
  if (!io) return;

  const roomName = `group:${groupId}`;
  const sockets = await io.in(roomName).fetchSockets();

  sockets.forEach((socket) => {
    if (socket.data?.userId === userId) {
      socket.leave(roomName);
    }
  });
};
