import { GroupMemberRole } from "@prisma/client";
import prisma from "@shared/primsa";

export const createGroup = async ({
  name,
  description,
  userId,
  isPrivate,
}: any) => {
  const group = await prisma.group.create({
    data: {
      name,
      description,
      isPrivate: !!isPrivate,
      creator: {
        connect: { id: userId },
      },
      members: {
        create: {
          user: {
            connect: { id: userId },
          },
          role: GroupMemberRole.OWNER,
        },
      },
    },
  });
  return group;
};

export const getGroupById = async (groupId: string) => {
  return prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
      messages: false,
    },
  });
};

export const listUserGroups = async (userId: string) => {
  // groups created by user or where user is a member
  const created = await prisma.group.findMany({
    where: { createdBy: userId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
    },
  });

  const memberOf = await prisma.group.findMany({
    where: { members: { some: { userId } } },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
    },
  });

  // merge unique
  const map = new Map<string, any>();
  created.concat(memberOf).forEach((g) => map.set(g.id, g));
  return Array.from(map.values());
};

export const updateGroup = async (groupId: string, data: any) => {
  return prisma.group.update({ where: { id: groupId }, data });
};

export const deleteGroup = async (groupId: string) => {
  return prisma.group.delete({ where: { id: groupId } });
};

/**
 * Temporary: persist group image URL by appending it to description.
 * Recommended: add `image String?` field to Group model and migrate, then store there.
 */
export const updateGroupImage = async (groupId: string, imageUrl: string) => {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw new Error("Group not found");
  const newDesc = `${group.description ?? ""}\n_image:${imageUrl}`;
  return prisma.group.update({
    where: { id: groupId },
    data: { description: newDesc },
  });
};

export const addUserToGroup = async (
  groupId: string,
  userId: string,
  role: GroupMemberRole
) => {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw new Error("Group not found");

  // Check if user is already a member
  const existingMember = await prisma.groupMember.findUnique({
    where: {
      userId_groupId: {
        userId,
        groupId,
      },
    },
  });

  if (existingMember) {
    throw new Error("User is already a member of this group");
  }

  const member = await prisma.groupMember.create({
    data: {
      user: {
        connect: { id: userId },
      },
      group: {
        connect: { id: groupId },
      },
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
    },
  });
  return member;
};

export const removeUserFromGroup = async (
  groupId: string,
  userId: string,
  removedByUserId: string
) => {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!group) throw new Error("Group not found");

  // Check if the user being removed exists in the group
  const memberToRemove = await prisma.groupMember.findUnique({
    where: {
      userId_groupId: {
        userId,
        groupId,
      },
    },
    include: {
      user: true,
    },
  });

  if (!memberToRemove) {
    throw new Error("User is not a member of this group");
  }

  // Check if the person removing is authorized (group owner/admin or removing themselves)
  const removerMember = await prisma.groupMember.findUnique({
    where: {
      userId_groupId: {
        userId: removedByUserId,
        groupId,
      },
    },
  });

  if (!removerMember) {
    throw new Error("You are not a member of this group");
  }

  // Allow users to remove themselves, or owners/admins to remove others
  const canRemove =
    userId === removedByUserId || // User removing themselves
    removerMember.role === GroupMemberRole.OWNER ||
    removerMember.role === GroupMemberRole.ADMIN;

  if (!canRemove) {
    throw new Error("You don't have permission to remove this user");
  }

  // Prevent removing the group owner unless they're removing themselves
  if (
    memberToRemove.role === GroupMemberRole.OWNER &&
    userId !== removedByUserId
  ) {
    throw new Error("Cannot remove the group owner");
  }

  // Remove the member
  await prisma.groupMember.delete({
    where: {
      userId_groupId: {
        userId,
        groupId,
      },
    },
  });

  return {
    removedUser: memberToRemove.user,
    remainingMembersCount: group.members.length - 1,
  };
};

export const updateMemberRole = async (
  groupId: string,
  userId: string,
  newRole: GroupMemberRole,
  updatedByUserId: string
) => {
  // Get the group with members
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
    },
  });

  if (!group) {
    throw new Error("Group not found");
  }

  // Check if the user to update exists in the group
  const memberToUpdate = group.members.find(
    (member) => member.userId === userId
  );
  if (!memberToUpdate) {
    throw new Error("User is not a member of this group");
  }

  // Check if the requester exists in the group
  const updaterMember = group.members.find(
    (member) => member.userId === updatedByUserId
  );
  if (!updaterMember) {
    throw new Error("You are not a member of this group");
  }

  // Permission checks
  const canUpdateRole =
    updaterMember.role === GroupMemberRole.OWNER ||
    (updaterMember.role === GroupMemberRole.ADMIN &&
      memberToUpdate.role === GroupMemberRole.MEMBER);

  if (!canUpdateRole) {
    throw new Error("You don't have permission to change this user's role");
  }

  // Prevent changing the owner's role unless they're doing it themselves
  if (
    memberToUpdate.role === GroupMemberRole.OWNER &&
    userId !== updatedByUserId
  ) {
    throw new Error("Cannot change the group owner's role");
  }

  // Prevent creating multiple owners (only owner can promote to owner)
  if (
    newRole === GroupMemberRole.OWNER &&
    updaterMember.role !== GroupMemberRole.OWNER
  ) {
    throw new Error("Only the current owner can promote someone to owner");
  }

  // Update the member role
  const updatedMember = await prisma.groupMember.update({
    where: {
      userId_groupId: {
        userId,
        groupId,
      },
    },
    data: {
      role: newRole,
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
    },
  });

  return {
    updatedMember,
    previousRole: memberToUpdate.role,
    newRole,
  };
};
