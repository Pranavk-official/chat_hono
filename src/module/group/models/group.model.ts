import z from "zod";

export const createGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isPrivate: z.boolean().optional(),
});

export const updateGroupSchema = createGroupSchema.partial();

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;

export default createGroupSchema;
