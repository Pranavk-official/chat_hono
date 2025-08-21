import prisma from "@shared/primsa";

export const getUserById = async (id: string) => {
  return prisma.user.findUnique({ where: { id } });
};

export const listUsers = async () => {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, image: true, role: true },
  });
};

export const updateUser = async (id: string, data: any) => {
  return prisma.user.update({ where: { id }, data });
};

export const deleteUser = async (id: string) => {
  return prisma.user.delete({ where: { id } });
};

export const updateUserImage = async (id: string, imageUrl: string) => {
  return prisma.user.update({ where: { id }, data: { image: imageUrl } });
};

export const searchUsers = async (query: string) => {
  return prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    },
  });
};
