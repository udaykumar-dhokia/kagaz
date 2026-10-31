import { z } from "zod";

export const registerShopSchema = z.object({
  name: z.string().min(2, "Shop name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  address: z.string().optional(),
  upiId: z.string().optional(),
  // Printing rates and capabilities
  isColorEnabled: z.boolean().default(false),
  isDuplexEnabled: z.boolean().default(true),
  bwSinglePrice: z.coerce.number().positive().default(2.0),
  bwDoublePrice: z.coerce.number().positive().default(1.5),
  colorSinglePrice: z.coerce.number().positive().default(10.0),
  colorDoublePrice: z.coerce.number().positive().default(8.0),
});

export const loginShopSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

