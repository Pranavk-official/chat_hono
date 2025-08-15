import { createMiddleware } from "hono/factory";
import { verifyToken, JwtPayload } from "@utils/jwt";
import { TooManyRequestsError, UnauthorizedError } from "@shared/error";
import redis from "@shared/redis";
import { getConnInfo } from "hono/bun";
import {
  OTP_BLOCK_DURATION,
  OTP_IP_BLOCK_DURATION,
  OTP_IP_RATE_LIMIT,
  OTP_RATE_LIMIT,
} from "@shared/constants";
import { User } from "@prisma/client";

type AuthEnv = {
  Variables: {
    user: JwtPayload | User;
    token: string;
  };
};

declare module "hono" {
  interface ContextVariableMap {
    user: JwtPayload | User;
    token: string;
  }
}

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Authorization header is missing or malformed");
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    throw new UnauthorizedError("Token not found");
  }

  const decoded = verifyToken(token);

  if (decoded.type !== "access") {
    throw new UnauthorizedError("Invalid token type. Access token required.");
  }

  c.set("user", decoded);
  c.set("token", token);

  await next();
});

export const otpRateLimiter = createMiddleware(async (c, next) => {
  const conn = getConnInfo(c);

  if (redis.status !== "ready") {
    await next(); // Skip rate limiting if Redis is not ready
  }
  const body = await c.req.json();
  const { email } = body;

  if (!email) {
    c.req.json = () => Promise.resolve(body);
    await next();
    return;
  }

  // Email-based rate limiting (1 minute window - max 3 requests)
  const emailMinuteKey = `otp:request:email:minute:${email}`;
  const emailMinuteCount = await redis.incr(emailMinuteKey);
  if (emailMinuteCount === 1) {
    await redis.expire(emailMinuteKey, 60); // 1 minute expiration
  }

  if (emailMinuteCount > 3) {
    throw new TooManyRequestsError(
      "Too many OTP requests. Maximum 3 requests per minute allowed."
    );
  }

  // Email-based rate limiting (existing 10 minute block)
  const isBlocked = await redis.get(`block:otp:${email}`);
  if (isBlocked) {
    throw new TooManyRequestsError(
      "Too many OTP requests. Please try again after 10 minutes."
    );
  }

  const requestCount = await redis.incr(`otp:request:${email}`);
  if (requestCount === 1) {
    await redis.expire(`otp:request:${email}`, OTP_BLOCK_DURATION); // Set expiration for 10 minutes
  }

  if (requestCount > OTP_RATE_LIMIT) {
    await redis.set(`block:otp:${email}`, "blocked", "EX", OTP_BLOCK_DURATION); // Block for 10 minutes
    throw new TooManyRequestsError(
      "Too many OTP requests. Please try again after 10 minutes."
    );
  }

  // IP-based rate limiting
  const ip = conn.remote.address || "unknown-ip";

  const isIpBlocked = await redis.get(`block:otp:ip:${ip}`);
  if (isIpBlocked) {
    throw new TooManyRequestsError(
      "Too many OTP requests from this IP. Please try again after 1 hour."
    );
  }

  const ipRequestCount = await redis.incr(`otp:request:ip:${ip}`);
  if (ipRequestCount === 1) {
    await redis.expire(`otp:request:ip:${ip}`, OTP_IP_BLOCK_DURATION);
  }

  if (ipRequestCount > OTP_IP_RATE_LIMIT) {
    await redis.set(
      `block:otp:ip:${ip}`,
      "blocked",
      "EX",
      OTP_IP_BLOCK_DURATION
    );
    throw new TooManyRequestsError(
      "Too many OTP requests from this IP. Please try again after 1 hour."
    );
  }

  // Because we've consumed the body stream, we need to make it available again
  c.req.json = () => Promise.resolve(body);
  await next();
});
