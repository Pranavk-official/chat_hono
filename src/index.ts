import { Hono } from "hono";
import { logger } from "hono/logger";
import auth_routes from "@module/auth/route";

const app = new Hono();

app.use(logger());

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

// Auth routes
app.route("/api/", auth_routes);

export default app;
