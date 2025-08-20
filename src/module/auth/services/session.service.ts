import prisma from "@shared/primsa";
import { OTP_EXPIRATION_TIME, DEFAULT_DEV_OTP } from "@shared/constants";
import { UnauthorizedError, NotFoundError } from "@shared/error";
import sendEmail from "@utils/email";
import { generateAuthToken } from "@utils/jwt";
import { randomBytes } from "crypto";

// --- Session Management ---
export async function createUserSession(
  userId: string,
  refreshToken: string,
  userAgent?: string,
  ipAddress?: string
) {
  // Invalidate previous sessions for this user (optional, for single-device login)
  // await prisma.session.deleteMany({ where: { userId } });

  return prisma.session.create({
    data: {
      id: randomBytes(16).toString("hex"),
      userId,
      token: refreshToken, // Store refresh token, not access token
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      createdAt: new Date(),
      updatedAt: new Date(),
      userAgent,
      ipAddress,
    },
  });
}

export async function removeUserSession(refreshToken: string) {
  // Remove session by refresh token (logout)
  return prisma.session.deleteMany({ where: { token: refreshToken } });
}

export async function findSessionByToken(token: string) {
  return prisma.session.findUnique({ where: { token } });
}

// --- Create Session ---
export async function createSession(
  userId: string,
  userAgent?: string,
  ipAddress?: string
) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const session = await prisma.session.create({
    data: {
      id: randomBytes(16).toString("hex"),
      userId,
      token,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
      userAgent,
      ipAddress,
    },
  });
  return session;
}
