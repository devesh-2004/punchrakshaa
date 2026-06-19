import { z } from "zod";

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, { message: "Invalid phone number" });

export const addressSchema = z.object({
  fullName: z.string().trim().min(2),
  phone: phoneSchema,
  addressLine1: z.string().trim().min(5),
  addressLine2: z.string().trim().optional().default(""),
  city: z.string().trim().optional().default("N/A"),
  state: z.string().trim().optional().default("N/A"),
  pincode: z.string().trim().regex(/^\d{6}$/, { message: "Invalid pincode" }),
});

