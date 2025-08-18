import { z } from "zod";

export const scopeEnum = z.enum(["SIGNUP", "LOGIN"]);

export const generateOtpSchema = z.object({
  email: z.email(),
  scope: scopeEnum,
});

export const verifySignupSchema = z.object({
  email: z.email(),
  otp: z.string().length(6),
  name: z.string().min(1),
});

export const loginSchema = z.object({
  identifier: z.email(),
  otp: z.string().length(6),
});

export type ScopeEnumType = z.infer<typeof scopeEnum>;

export type GenerateOtpInput = z.infer<typeof generateOtpSchema>;
export type VerifySignupInput = z.infer<typeof verifySignupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
