import { Hono } from "hono";
import { logger } from "hono/logger";
import auth_routes from "@module/auth/routes/auth.route";
import user_routes from "@module/user/routes/user.route";
import group_routes from "@module/group/routes/group.route";
import { authMiddleware } from "@middleware/auth";
import { errorHandler } from "./error";
import { NotFoundError } from "@shared/error";

const app = new Hono();

app.use(logger());

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

// Auth routes
app.route("/api/", auth_routes);
app.use(authMiddleware);
app.route("/api/users", user_routes);
app.route("/api/groups", group_routes);

app.notFound((c) => {
  throw new NotFoundError(`Route not found: ${c.req.path}`);
});
app.onError(errorHandler);

export default app;
