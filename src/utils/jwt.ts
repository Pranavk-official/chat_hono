import * as jwt from "jsonwebtoken";
import * as fs from "fs";
import { UnauthorizedError } from "@shared/error";

const PRIVATE_KEY_PATH = process.env.PRIVATE_KEY_PATH || "private.key";
const PUBLIC_KEY_PATH = process.env.PUBLIC_KEY_PATH || "public.key";

export interface JwtPayload {
  id: string;
  email?: string;
  emailVerified: boolean;
  type: "access" | "refresh";
}

export const generateAuthToken = (
  payload: Omit<JwtPayload, "type">
): string => {
  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, "utf-8");

  const tokenPayload: JwtPayload = {
    ...payload,
    type: "access",
  };

  return jwt.sign(tokenPayload, privateKey, {
    algorithm: "RS256",
    expiresIn: "30d", // Access token expires in 30 days
    issuer: "decidr-backend",
    audience: "decidr-client",
  });
};

export const generateRefreshToken = (
  payload: Omit<JwtPayload, "type">
): string => {
  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, "utf-8");

  const tokenPayload: JwtPayload = {
    ...payload,
    type: "refresh",
  };

  return jwt.sign(tokenPayload, privateKey, {
    algorithm: "RS256",
    expiresIn: "30d", // Refresh token expires in 30 days
    issuer: "decidr-backend",
    audience: "decidr-client",
  });
};

export const verifyToken = (token: string): JwtPayload => {
  try {
    const publicKey = fs.readFileSync(PUBLIC_KEY_PATH, "utf-8");

    const decoded = jwt.verify(token, publicKey, {
      algorithms: ["RS256"],
      issuer: "decidr-backend",
      audience: "decidr-client",
    }) as JwtPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError("Token has expired");
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError("Invalid token");
    } else {
      throw new UnauthorizedError("Token verification failed");
    }
  }
};

export const refreshAccessToken = (refreshToken: string): string => {
  const publicKey = fs.readFileSync(PUBLIC_KEY_PATH, "utf-8");

  try {
    const decoded = jwt.verify(refreshToken, publicKey, {
      algorithms: ["RS256"],
      issuer: "decidr-backend",
      audience: "decidr-client",
    }) as JwtPayload;

    if (decoded.type !== "refresh") {
      throw new UnauthorizedError("Invalid token type");
    }

    // Generate a new access token
    const newAccessToken = generateAuthToken({
      id: decoded.id,
      email: decoded.email,
      emailVerified: decoded.emailVerified,
    });

    return newAccessToken;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError("Refresh token has expired");
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError("Invalid refresh token");
    }
    throw new UnauthorizedError("Token refresh failed");
  }
};
