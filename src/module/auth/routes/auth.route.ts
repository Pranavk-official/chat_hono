import { Hono } from "hono";
import {
  generateOtpService,
  refreshTokenService,
  verifyOtpService,
  generateTokensService,
  createUserService,
  getUserByEmail,
} from "@module/auth/services/auth.service";
import {
  createUserSession,
  removeUserSession,
} from "@module/auth/services/session.service";
import { zValidator } from "@hono/zod-validator";
import {
  generateOtpSchema,
  loginSchema,
  verifySignupSchema,
} from "@module/auth/models/auth.model";
import responder from "@shared/responder";
import { otpRateLimiter } from "@middleware/auth";

const app = new Hono();

app.post("/generate-otp", otpRateLimiter, async (c) => {
  const body = await c.req.json();
  generateOtpSchema.parse(body);
  const { email } = body;
  const { expiresAt, message } = await generateOtpService(body);
  const response = responder(
    { email, expiresAt: expiresAt.toISOString() },
    { path: c.req.path, message }
  );
  return c.json(response, 200);
});

app.post("/signup", zValidator("json", verifySignupSchema), async (c) => {
  const { otp, email, name } = c.req.valid("json");
  await verifyOtpService({ email: email, otp, scope: "SIGNUP" });
  const user = await createUserService({ email, name });
  const tokens = await generateTokensService(user);
  await createUserSession(user.id, tokens.accessToken);
  const response = responder(
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      tokens,
    },
    { path: c.req.path, message: "OTP verified successfully" }
  );
  return c.json(response, 201);
});

app.post("/login", zValidator("json", loginSchema), async (c) => {
  const { identifier, otp } = c.req.valid("json");
  await verifyOtpService({ email: identifier, otp, scope: "LOGIN" });
  const user = await getUserByEmail(identifier);
  const tokens = await generateTokensService(user!);
  await createUserSession(user!.id, tokens.accessToken);
  const response = responder(
    {
      user: {
        id: user?.id,
        name: user?.name,
        email: user?.email,
        image: user?.image,
        createdAt: user?.createdAt,
        updatedAt: user?.updatedAt,
      },
      tokens,
    },
    { path: c.req.path, message: "OTP verified successfully" }
  );
  return c.json(response, 200);
});

import { refreshTokenSchema } from "@module/auth/models/refresh.model";

app.post(
  "/refresh-token",
  zValidator("json", refreshTokenSchema),
  async (c) => {
    const { refreshToken } = c.req.valid("json");
    const tokens = await refreshTokenService({ refreshToken });
    const response = responder(
      { tokens },
      { path: c.req.path, message: "Token refreshed successfully" }
    );
    return c.json(response, 200);
  }
);

app.post("/logout", async (c) => {
  const token = c.req.header("Authorization")?.split(" ")[1]; // Bearer token format
  await removeUserSession(token!);
  const response = responder(
    {},
    { path: c.req.path, message: "Logged out successfully" }
  );
  return c.json(response, 200);
});

export default app;
