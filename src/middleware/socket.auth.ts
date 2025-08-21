import { Socket } from "socket.io";
import { verifyToken } from "@utils/jwt";
import { UnauthorizedError } from "@shared/error";
import { getUserGroupMembership } from "@module/group/services/chat.service";
import redis from "@shared/redis";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@shared/socket";

export const authenticateSocket = async (
  socket: Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >,
  next: (err?: Error) => void
) => {
  try {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.replace("Bearer ", "");

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
};

// Middleware to check if user is member of a group
export const verifyGroupMembership = async (
  userId: string,
  groupId: string
): Promise<boolean> => {
  try {
    const membership = await getUserGroupMembership(userId, groupId);
    return !!membership;
  } catch (error) {
    console.error("Error verifying group membership:", error);
    return false;
  }
};
