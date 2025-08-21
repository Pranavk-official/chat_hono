import prisma from "@shared/primsa";
import { MessageType, GroupMemberRole } from "@prisma/client";
import { NotFoundError, ForbiddenError, BadRequestError } from "@shared/error";
import { connect } from "http2";

export interface CreateMessageData {
  content: string;
  type: MessageType;
  senderId: string;
  groupId: string;
  replyToId?: string;
}

export interface MessageWithUser {
  id: string;
  content: string;
  type: MessageType;
  senderId: string;
  groupId: string;
  replyToId?: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  replyTo?: {
    id: string;
    content: string;
    user: {
      id: string;
      name: string;
    };
  };
}

// Check if user is a member of a group
export const getUserGroupMembership = async (
  userId: string,
  groupId: string
) => {
  const membership = await prisma.groupMember.findUnique({
    where: {
      userId_groupId: {
        userId,
        groupId,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      group: {
        select: {
          id: true,
          name: true,
          description: true,
          isPrivate: true,
          createdBy: true,
        },
      },
    },
  });

  return membership;
};

// Verify user can access group
export const verifyGroupAccess = async (userId: string, groupId: string) => {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        where: { userId },
      },
    },
  });

  if (!group) {
    throw new NotFoundError("Group not found");
  }

  // Check if user is group creator or member
  const isCreator = group.createdBy === userId;
  const isMember = group.members.length > 0;

  if (!isCreator && !isMember) {
    throw new ForbiddenError("You are not a member of this group");
  }

  return group;
};

// Create a new message
export const createMessage = async (data: CreateMessageData) => {
  console.log(data);
  const { content, type, senderId, groupId, replyToId } = data;

  // Verify user has access to the group
  await verifyGroupAccess(senderId, groupId);

  // If replying to a message, verify the original message exists and is in the same group
  if (replyToId) {
    const originalMessage = await prisma.message.findUnique({
      where: { id: replyToId },
    });

    if (!originalMessage || originalMessage.groupId !== groupId) {
      throw new BadRequestError("Invalid reply message");
    }
  }

  // Create the message
  const message = await prisma.message.create({
    data: {
      content,
      type,
      groupId,
      replyToId,
      senderId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      replyTo: {
        select: {
          id: true,
          content: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  console.log("message from service", message);

  return message as MessageWithUser;
};

// Get messages for a group with pagination
export const getGroupMessages = async (
  groupId: string,
  userId: string,
  limit: number = 50,
  cursor?: string
) => {
  // Verify user has access to the group
  await verifyGroupAccess(userId, groupId);

  const whereClause: any = {
    groupId,
  };

  // Add cursor-based pagination
  if (cursor) {
    whereClause.id = {
      lt: cursor, // Get messages before this cursor (older messages)
    };
  }

  const messages = await prisma.message.findMany({
    where: whereClause,
    orderBy: {
      createdAt: "desc", // Most recent first
    },
    take: limit + 1, // Take one extra to check if there are more
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      replyTo: {
        select: {
          id: true,
          content: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      attachments: {
        select: {
          id: true,
          url: true,
          filename: true,
          mimeType: true,
          size: true,
        },
      },
    },
  });

  // Check if there are more messages
  const hasNextPage = messages.length > limit;
  if (hasNextPage) {
    messages.pop(); // Remove the extra message
  }

  // Get the next cursor (last message id)
  const nextCursor =
    hasNextPage && messages.length > 0
      ? messages[messages.length - 1].id
      : undefined;

  // Reverse to get chronological order (oldest to newest)
  const reversedMessages = messages.reverse();

  return {
    messages: reversedMessages,
    hasNextPage,
    nextCursor,
  };
};

// Get a single message by ID
export const getMessageById = async (messageId: string, userId: string) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      replyTo: {
        select: {
          id: true,
          content: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      attachments: {
        select: {
          id: true,
          url: true,
          filename: true,
          mimeType: true,
          size: true,
        },
      },
    },
  });

  if (!message) {
    throw new NotFoundError("Message not found");
  }

  // Verify user has access to the group
  await verifyGroupAccess(userId, message.groupId);

  return message;
};

// Update a message (only content can be updated)
export const updateMessage = async (
  messageId: string,
  userId: string,
  content: string
) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new NotFoundError("Message not found");
  }

  // Only the sender can update their message
  if (message.senderId !== userId) {
    throw new ForbiddenError("You can only edit your own messages");
  }

  // Update the message
  const updatedMessage = await prisma.message.update({
    where: { id: messageId },
    data: { content },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      replyTo: {
        select: {
          id: true,
          content: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return updatedMessage;
};

// Delete a message
export const deleteMessage = async (messageId: string, userId: string) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      group: {
        include: {
          members: {
            where: { userId },
          },
        },
      },
    },
  });

  if (!message) {
    throw new NotFoundError("Message not found");
  }

  // Check permissions: message sender, group creator, or group admin can delete
  const isSender = message.senderId === userId;
  const isGroupCreator = message.group.createdBy === userId;
  const isGroupAdmin = message.group.members.some(
    (member) =>
      member.userId === userId && member.role === GroupMemberRole.ADMIN
  );

  if (!isSender && !isGroupCreator && !isGroupAdmin) {
    throw new ForbiddenError(
      "You don't have permission to delete this message"
    );
  }

  // Delete the message (cascades to attachments due to schema)
  await prisma.message.delete({
    where: { id: messageId },
  });

  return { success: true, messageId };
};

// Add user to group
export const addUserToGroup = async (
  groupId: string,
  userId: string,
  addedBy: string,
  role: GroupMemberRole = GroupMemberRole.MEMBER
) => {
  // Verify the person adding has permission
  const membership = await getUserGroupMembership(addedBy, groupId);
  if (
    !membership ||
    (membership.role !== GroupMemberRole.ADMIN &&
      membership.role !== GroupMemberRole.OWNER)
  ) {
    throw new ForbiddenError(
      "You don't have permission to add users to this group"
    );
  }

  // Check if user is already a member
  const existingMembership = await getUserGroupMembership(userId, groupId);
  if (existingMembership) {
    throw new BadRequestError("User is already a member of this group");
  }

  // Add the user to the group
  const newMembership = await prisma.groupMember.create({
    data: {
      userId,
      groupId,
      role,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      group: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return newMembership;
};

// Remove user from group
export const removeUserFromGroup = async (
  groupId: string,
  userId: string,
  removedBy: string
) => {
  // Verify the person removing has permission
  const removerMembership = await getUserGroupMembership(removedBy, groupId);
  if (
    !removerMembership ||
    (removerMembership.role !== GroupMemberRole.ADMIN &&
      removerMembership.role !== GroupMemberRole.OWNER)
  ) {
    throw new ForbiddenError(
      "You don't have permission to remove users from this group"
    );
  }

  // Check if user is a member
  const userMembership = await getUserGroupMembership(userId, groupId);
  if (!userMembership) {
    throw new NotFoundError("User is not a member of this group");
  }

  // Can't remove the group owner
  if (userMembership.role === GroupMemberRole.OWNER) {
    throw new ForbiddenError("Cannot remove the group owner");
  }

  // Remove the user from the group
  await prisma.groupMember.delete({
    where: {
      userId_groupId: {
        userId,
        groupId,
      },
    },
  });

  return { success: true, userId, groupId };
};

// Get group members
export const getGroupMembers = async (groupId: string, userId: string) => {
  // Verify user has access to the group
  await verifyGroupAccess(userId, groupId);

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
        },
      },
    },
    orderBy: [
      { role: "asc" }, // Owners first, then admins, then members
      { joinedAt: "asc" }, // Then by join date
    ],
  });

  return members;
};
