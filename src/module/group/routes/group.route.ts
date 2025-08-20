import { Hono } from "hono";
import responder from "@shared/responder";
import {
  createGroup,
  getGroupById,
  listUserGroups,
  updateGroup,
  deleteGroup,
} from "../services";
import { createGroupSchema, updateGroupSchema } from "../models/group.model";
import { uploadImage } from "@utils/upload";
import { updateGroupImage } from "../services";
import cloudinaryMiddleware from "@middleware/cloudinary.middleware";

const app = new Hono();

// ...schemas imported from models

app.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success)
    return c.json({ success: false, message: parsed.error.message }, 400);
  const user = (await c.get("user")) as any;
  if (!user?.id)
    return c.json({ success: false, message: "Unauthorized" }, 401);
  const userId = user.id;
  const group = await createGroup({ ...parsed.data, userId });
  return c.json(
    responder(group, { path: c.req.path, message: "Group created" }),
    201
  );
});

app.get("/", async (c) => {
  const user = (await c.get("user")) as any;
  if (!user?.id)
    return c.json({ success: false, message: "Unauthorized" }, 401);
  const userId = user.id;
  const groups = await listUserGroups(userId);
  return c.json(
    responder(groups, { path: c.req.path, message: "User groups" }),
    200
  );
});

app.get("/:groupId", async (c) => {
  const { groupId } = c.req.param();
  const group = await getGroupById(groupId);
  if (!group)
    return c.json({ success: false, message: "Group not found" }, 404);
  return c.json(
    responder(group, { path: c.req.path, message: "Group details" }),
    200
  );
});

app.put("/:groupId", async (c) => {
  const { groupId } = c.req.param();
  const body = await c.req.json();
  const parsed = updateGroupSchema.safeParse(body);
  if (!parsed.success)
    return c.json({ success: false, message: parsed.error.message }, 400);
  const updated = await updateGroup(groupId, parsed.data);
  return c.json(
    responder(updated, { path: c.req.path, message: "Group updated" }),
    200
  );
});

app.delete("/:groupId", async (c) => {
  const { groupId } = c.req.param();
  await deleteGroup(groupId);
  return c.json(
    responder({}, { path: c.req.path, message: "Group deleted" }),
    200
  );
});

// Upload group image
app.post("/:groupId/image", cloudinaryMiddleware, async (c) => {
  const { groupId } = c.req.param();
  const form = await c.req.parseBody();
  let imageInput = form["image"];

  if (!imageInput)
    return c.json({ success: false, message: "Image required" }, 400);

  const result = await uploadImage(imageInput, `groups/${groupId}`);
  const url = result.secure_url;
  const updated = await updateGroupImage(groupId, url);
  return c.json(
    responder(
      { url, group: updated },
      { path: c.req.path, message: "Image uploaded" }
    ),
    200
  );
});

export default app;
