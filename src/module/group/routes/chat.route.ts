import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import responder from "@shared/responder";
import {
  createMessage,
  getGroupMessages,
  getMessageById,
  updateMessage,
  deleteMessage,
  getGroupMembers,
  addUserToGroup,
  removeUserFromGroup,
} from "../services/chat.service";
import {
  createMessageSchema,
  updateMessageSchema,
  getMessagesSchema,
  addMemberSchema,
  removeMemberSchema,
} from "../models/chat.model";
import { GroupMemberRole } from "@prisma/client";

const app = new Hono();

// Create a new message
app.post("/messages", zValidator("json", createMessageSchema), async (c) => {
  const body = c.req.valid("json");
  const user = await c.get("user");

  if (!user?.id) {
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }

  const message = await createMessage({
    ...body,
    senderId: user.id,
  });

  return c.json(
    responder(message, { path: c.req.path, message: "Message created" }),
    201
  );
});

// Get messages for a group
app.get(
  "/:groupId/messages",
  zValidator("query", getMessagesSchema),
  async (c) => {
    const { groupId } = c.req.param();
    const query = c.req.valid("query");
    const user = await c.get("user");

    const result = await getGroupMessages(
      groupId,
      user.id,
      query.limit,
      query.cursor
    );

    return c.json(
      responder(result, { path: c.req.path, message: "Messages retrieved" }),
      200
    );
  }
);

// Get a specific message
app.get("/messages/:messageId", async (c) => {
  const { messageId } = c.req.param();
  const user = await c.get("user");

  if (!user?.id) {
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }

  const message = await getMessageById(messageId, user.id);

  return c.json(
    responder(message, { path: c.req.path, message: "Message retrieved" }),
    200
  );
});

// Update a message
app.put(
  "/messages/:messageId",
  zValidator("json", updateMessageSchema),
  async (c) => {
    const { messageId } = c.req.param();
    const body = c.req.valid("json");
    const user = await c.get("user");

    if (!user?.id) {
      return c.json({ success: false, message: "Unauthorized" }, 401);
    }

    const updatedMessage = await updateMessage(
      messageId,
      user.id,
      body.content
    );

    return c.json(
      responder(updatedMessage, {
        path: c.req.path,
        message: "Message updated",
      }),
      200
    );
  }
);

// Delete a message
app.delete("/messages/:messageId", async (c) => {
  const { messageId } = c.req.param();
  const user = await c.get("user");

  if (!user?.id) {
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }

  const result = await deleteMessage(messageId, user.id);

  return c.json(
    responder(result, { path: c.req.path, message: "Message deleted" }),
    200
  );
});

// Get group members
app.get("/:groupId/members", async (c) => {
  const { groupId } = c.req.param();
  const user = await c.get("user");

  if (!user?.id) {
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }

  const members = await getGroupMembers(groupId, user.id);

  return c.json(
    responder(members, {
      path: c.req.path,
      message: "Group members retrieved",
    }),
    200
  );
});

// Add user to group
app.post(
  "/:groupId/members",
  zValidator("json", addMemberSchema),
  async (c) => {
    const { groupId } = c.req.param();
    const body = c.req.valid("json");
    const user = await c.get("user");

    if (!user?.id) {
      return c.json({ success: false, message: "Unauthorized" }, 401);
    }

    const membership = await addUserToGroup(
      groupId,
      body.userId,
      user.id,
      body.role as GroupMemberRole
    );

    return c.json(
      responder(membership, {
        path: c.req.path,
        message: "User added to group",
      }),
      201
    );
  }
);

// Remove user from group
app.delete(
  "/:groupId/members",
  zValidator("json", removeMemberSchema),
  async (c) => {
    const { groupId } = c.req.param();
    const body = c.req.valid("json");
    const user = await c.get("user");

    if (!user?.id) {
      return c.json({ success: false, message: "Unauthorized" }, 401);
    }

    const result = await removeUserFromGroup(groupId, body.userId, user.id);

    return c.json(
      responder(result, {
        path: c.req.path,
        message: "User removed from group",
      }),
      200
    );
  }
);

export default app;
