import { sanitizeName } from "@utils/sanitize";
import z from "zod";

export const UserSchema = z.object({
  userId: z.uuid(),
  email: z.email(),
  name: z.string().min(1, "Name is required").transform(sanitizeName),
  emailVerified: z.boolean(),
  image: z.url().optional(),
  role: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
