import { Hono } from "hono";
import { auth } from "@shared/auth";
import type { AuthType } from "@shared/auth";

const app = new Hono<{ Bindings: AuthType }>({
  strict: false,
});

app.on(["POST", "GET"], "/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

export default app;
