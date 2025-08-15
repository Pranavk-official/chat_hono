import { Hono } from "hono";
import { logger } from "hono/logger";
import auth_routes from "@module/auth/routes/auth.route";
import { authMiddleware } from "@middleware/auth";

const app = new Hono();

app.use(logger());

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

// Auth routes
app.route("/api/", auth_routes);
app.use(authMiddleware);
app.get("/api/protected", async (c) => {
  const user = c.get("user");
  return c.text(
    "This is a protected route" + (user ? `, welcome ${user.email}!` : "")
  );
});

export default app;
