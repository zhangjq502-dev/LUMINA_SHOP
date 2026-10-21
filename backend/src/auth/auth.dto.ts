import { z } from "zod";
export const loginSchema = z
  .object({
    email: z
      .email()
      .trim()
      .max(120)
      .transform((s) => s.toLowerCase()),
    password: z.string().min(8).max(128),
  })
  .strict();
export const registerSchema = loginSchema
  .extend({ name: z.string().trim().min(1).max(40) })
  .strict();
