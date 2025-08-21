import { Hono } from "hono";
import { logger } from "hono/logger";
import auth_routes from "@module/auth/routes/auth.route";
import user_routes from "@module/user/routes/user.route";
import group_routes from "@module/group/routes/group.route";
import chat_routes from "@module/group/routes/chat.route";
import { authMiddleware } from "@middleware/auth";
import { errorHandler } from "./error";
import { NotFoundError } from "@shared/error";
import { initializeSocket } from "@shared/socket";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";

const app = new Hono();

const server = serve(
  {
    port: 3000,
    fetch: app.fetch,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);

// Initialize Socket.IO
const io = initializeSocket(server);

declare module "hono" {
  interface ContextVariableMap {
    io: typeof io;
  }
}

app.use(async (c, next) => {
  c.set("io", io);
  await next();
});

app.use(
  cors({
    origin: "*", // Adjust as needed for your CORS policy
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(logger());

// Health check endpoint
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    features: {
      chat: true,
      socketio: true,
      realtime: true,
    },
  });
});

// Auth routes (public)
app.route("/api/auth", auth_routes);

// Apply auth middleware only to API routes, not Socket.IO
app.use("/api/*", authMiddleware);
app.route("/api/users", user_routes);
app.route("/api/groups", group_routes);
app.route("/api/chat", chat_routes);

app.notFound((c) => {
  throw new NotFoundError(`Route not found: ${c.req.path}`);
});

app.onError(errorHandler);

// server.listen(3000);

// export default app;
