import { z } from "zod";
export const checkoutSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    items: z
      .array(
        z
          .object({
            id: z.string().min(1).max(80),
            size: z.string().min(1).max(20),
            quantity: z.number().int().min(1).max(10),
          })
          .strict(),
      )
      .min(1)
      .max(50),
    shipping: z
      .object({
        recipient: z.string().trim().min(1).max(60),
        phone: z
          .string()
          .trim()
          .regex(/^[+\d ()-]{6,30}$/),
        email: z.email().max(120),
        province: z.string().trim().min(1).max(60),
        district: z.string().trim().min(1).max(60),
        address: z.string().trim().min(5).max(200),
      })
      .strict(),
  })
  .strict();

export const shippingSchema = checkoutSchema.shape.shipping;
