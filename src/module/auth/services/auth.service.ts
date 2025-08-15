import { User } from "@prisma/client";
import {
  DEFAULT_DEV_OTP,
  OTP_EXPIRATION_TIME,
  TOKEN_EXPIRATION_TIME,
} from "@shared/constants";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "@shared/error";
import prisma from "@shared/primsa";
import {
  generateAuthToken,
  generateRefreshToken,
  refreshAccessToken,
} from "@utils/jwt";
import { generateOtp } from "@utils/random";
import {
  ScopeEnumType,
  generateOtpSchema,
  verifySignupSchema,
  loginSchema,
} from "../models/auth.model";
import sendOtpEmail from "@utils/otp";
import sendWelcomeEmail from "@utils/welcome";

export const generateOtpService = async (body: {
  email: string;
  scope: ScopeEnumType;
}) => {
  generateOtpSchema.parse(body);
  const { email, scope } = body;
  const expiresAt = new Date(Date.now() + OTP_EXPIRATION_TIME);
  const otp =
    process.env.NODE_ENV === "development" ? DEFAULT_DEV_OTP : generateOtp();
  const userExists = await prisma.user.findUnique({ where: { email } });

  if (scope === "SIGNUP") {
    // Check if user exists
    if (userExists) {
      throw new BadRequestError("User with this email already exists");
    }
  } else if (scope === "LOGIN") {
    if (!userExists) {
      throw new NotFoundError("User not found");
    }
  } else {
    throw new BadRequestError("Invalid scope provided for OTP generation");
  }

  await prisma.verification.create({
    data: {
      identifier: email,
      value: otp,
      scope,
      expiresAt,
    },
  });

  if (process.env.NODE_ENV !== "development") {
    await sendOtpEmail(
      email,
      otp,
      expiresAt.toISOString(),
      scope.toLowerCase() as "signup" | "login"
    );
  }

  return {
    identifier: email,
    expiresAt,
    success: true,
    message: `OTP sent successfully for ${scope.toLowerCase()}`,
  };
};

export const verifyOtpService = async ({
  email,
  otp,
  scope,
  deleteOnSuccess = true,
}: {
  email: string;
  otp: string;
  scope: ScopeEnumType;
  deleteOnSuccess?: boolean;
}) => {
  // Validate input
  if (scope === "SIGNUP") {
    verifySignupSchema.pick({ email: true, otp: true }).parse({ email, otp });
  } else if (scope === "LOGIN") {
    loginSchema
      .pick({ identifier: true, otp: true })
      .parse({ identifier: email, otp });
  }
  const verification = await prisma.verification.findFirst({
    where: {
      identifier: email,
      value: otp,
      expiresAt: { gt: new Date() },
    },
  });
  if (!verification) {
    throw new BadRequestError("Invalid or expired OTP");
  }
  if (deleteOnSuccess) {
    await prisma.verification.delete({ where: { id: verification.id } });
  }
  return true;
};

export const createUserService = async ({
  email,
  name,
}: {
  email: string;
  name: string;
}) => {
  verifySignupSchema.pick({ email: true, name: true }).parse({ email, name });
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new BadRequestError("User with this email already exists");
  }
  const user = await prisma.user.create({
    data: {
      email,
      name,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  if (process.env.NODE_ENV !== "development") {
    await sendWelcomeEmail(user.email, user.name);
  }
  return user;
};

export const generateTokensService = async (user: User) => {
  const tokenPayload = {
    userId: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
  };
  const accessToken = generateAuthToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);
  return {
    accessToken,
    refreshToken,
    expiresIn: TOKEN_EXPIRATION_TIME,
  };
};

export const refreshTokenService = async (body: { refreshToken: string }) => {
  const { refreshToken } = body;

  // Find session by refresh token
  const session = await prisma.session.findUnique({
    where: { token: refreshToken },
  });
  if (!session) throw new UnauthorizedError("Invalid refresh token");

  try {
    // Verify and refresh the access token
    const newAccessToken = refreshAccessToken(refreshToken);

    // Invalidate the old refresh token session (token rotation)
    await prisma.session.delete({ where: { token: refreshToken } });

    // Generate a new refresh token
    const newRefreshToken = generateRefreshToken({
      userId: session.userId,
      emailVerified: true, // Assuming email is verified for refresh tokens
    });

    // Create a new session for the new refresh token
    await prisma.session.create({
      data: {
        id: require("crypto").randomBytes(16).toString("hex"),
        userId: session.userId,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  } catch (error) {
    throw new UnauthorizedError("Failed to refresh token");
  }
};

// Utility: get user by email
export const getUserByEmail = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new NotFoundError("User not found");
  return user;
};
