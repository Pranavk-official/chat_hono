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
      createdBy: userId,
    },
  });
  return group;
};

export const getGroupById = async (groupId: string) => {
  return prisma.group.findUnique({
    where: { id: groupId },
    include: { members: true, messages: false },
  });
};

export const listUserGroups = async (userId: string) => {
  // groups created by user or where user is a member
  const created = await prisma.group.findMany({ where: { createdBy: userId } });
  const memberOf = await prisma.group.findMany({
    where: { members: { some: { userId } } },
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
