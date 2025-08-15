import { createMiddleware } from "hono/factory";
import { auth, type AuthType } from "@shared/auth";
import { HTTPException } from "hono/http-exception";

// Extend the Hono context to include user and session
export type Variables = {
  user: AuthType["user"];
  session: AuthType["session"];
};

declare module "hono" {
  interface ContextVariableMap {
    user: Variables["user"];
    session: Variables["session"];
    token: string;
  }
}

export const authMiddleware = createMiddleware<{ Variables: Variables }>(
  async (c, next) => {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");

    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    c.set("user", session.user);
    c.set("session", session.session);

    await next();
  }
);

export const optionalAuthMiddleware = createMiddleware<{
  Variables: Partial<Variables>;
}>(async (c, next) => {
  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (session) {
      c.set("user", session.user);
      c.set("session", session.session);
    }
  } catch (error) {
    // Continue without authentication
  }

  await next();
});
