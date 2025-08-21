import { Hono } from "hono";
import responder from "@shared/responder";
import {
  createGroup,
  getGroupById,
  listUserGroups,
  updateGroup,
  deleteGroup,
  addUserToGroup,
  removeUserFromGroup,
  updateMemberRole,
} from "../services";
import { createGroupSchema, updateGroupSchema } from "../models/group.model";
import { uploadImage } from "@utils/upload";
import { updateGroupImage } from "../services";
import cloudinaryMiddleware from "@middleware/cloudinary.middleware";
import { group } from "console";

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

app.get("/:groupId/members", async (c) => {
  const { groupId } = c.req.param();
  const group = await getGroupById(groupId);
  if (!group)
    return c.json({ success: false, message: "Group not found" }, 404);
  return c.json(
    responder(group.members, { path: c.req.path, message: "Group members" }),
    200
  );
});

// Add member
app.post("/:groupId/members", async (c) => {
  const { groupId } = c.req.param();
  const body = await c.req.json();
  const user = (await c.get("user")) as any;
  if (!user?.id)
    return c.json({ success: false, message: "Unauthorized" }, 401);

  // Validate required fields
  if (!body.userId) {
    return c.json({ success: false, message: "userId is required" }, 400);
  }

  const requestingUserId = user.id;
  const result = await addUserToGroup(
    groupId,
    body.userId,
    body.role || "MEMBER"
  );
  return c.json(
    responder(result, { path: c.req.path, message: "Member added" }),
    201
  );
});

// Remove member
app.delete("/:groupId/members/:userId", async (c) => {
  const { groupId, userId } = c.req.param();
  const user = (await c.get("user")) as any;
  if (!user?.id)
    return c.json({ success: false, message: "Unauthorized" }, 401);

  const requestingUserId = user.id;
  const result = await removeUserFromGroup(groupId, userId, requestingUserId);
  return c.json(
    responder(result, { path: c.req.path, message: "Member removed" }),
    200
  );
});

// Update member role
app.put("/:groupId/members/:userId/role", async (c) => {
  const { groupId, userId } = c.req.param();
  const body = await c.req.json();
  const user = (await c.get("user")) as any;
  if (!user?.id)
    return c.json({ success: false, message: "Unauthorized" }, 401);

  // Validate required fields
  if (!body.role) {
    return c.json({ success: false, message: "role is required" }, 400);
  }

  // Validate role value
  const validRoles = ["OWNER", "ADMIN", "MEMBER"];
  if (!validRoles.includes(body.role)) {
    return c.json(
      {
        success: false,
        message: "Invalid role. Must be OWNER, ADMIN, or MEMBER",
      },
      400
    );
  }

  const requestingUserId = user.id;
  const result = await updateMemberRole(
    groupId,
    userId,
    body.role,
    requestingUserId
  );
  return c.json(
    responder(result, { path: c.req.path, message: "Member role updated" }),
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
