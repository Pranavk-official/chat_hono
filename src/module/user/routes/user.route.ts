import { Hono } from "hono";
import responder from "@shared/responder";
import { zValidator } from "@hono/zod-validator";
import {
  getUserById,
  updateUser,
  deleteUser,
  searchUsers,
} from "../services/user.service";
import { updateUserSchema } from "../models/user.model";

import { uploadImage } from "@utils/upload";
import { updateUserImage } from "../services/user.service";
// ...existing imports

const app = new Hono();

// user search route
app.get("/", async (c) => {
  const { search } = c.req.query();
  const data = await searchUsers(search);
  return c.json(responder(data, { path: c.req.path, message: "User" }), 200);
});

app.get("/me", async (c) => {
  const user = c.get("user");
  const userId = user?.id;
  const data = await getUserById(userId);
  if (!data) return c.json({ success: false, message: "User not found" }, 404);
  return c.json(responder(data, { path: c.req.path, message: "User" }), 200);
});

app.put("/me", zValidator("json", updateUserSchema), async (c) => {
  const user = c.get("user");
  const userId = user?.id;
  const body = c.req.valid("json");
  const updated = await updateUser(userId, body);
  return c.json(
    responder(updated, { path: c.req.path, message: "User updated" }),
    200
  );
});

app.delete("/me", async (c) => {
  const user = c.get("user");
  const userId = user?.id;
  await deleteUser(userId);
  return c.json(
    responder({}, { path: c.req.path, message: "User deleted" }),
    200
  );
});

// Upload user image (accepts multipart/form-data field 'image' or JSON { image: base64 })
app.post("/image", async (c) => {
  const user = c.get("user");
  const userId = user?.id;
  const contentType = c.req.header("content-type") || "";
  let imageInput: any = null;
  let folder = `users/${userId}`;

  if (contentType.includes("multipart/form-data")) {
    const form = await c.req.parseBody();
    imageInput = form["image"];
    if (form["folder"]) folder = String(form["folder"]);
  } else {
    const body = await c.req.json().catch(() => ({}));
    imageInput = body.image;
    if (body.folder) folder = body.folder;
  }

  if (!imageInput)
    return c.json({ success: false, message: "Image required" }, 400);

  const result = await uploadImage(imageInput, folder);
  const url = result.secure_url;
  const updated = await updateUserImage(userId, url);
  return c.json(
    responder(
      { url, user: updated },
      { path: c.req.path, message: "Image uploaded" }
    ),
    200
  );
});

export default app;
