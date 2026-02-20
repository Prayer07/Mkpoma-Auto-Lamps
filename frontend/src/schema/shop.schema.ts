import { z } from "zod"

export const addShopSchema = z.object({
  name: z.string().min(2, "Shop name is required"),
  location: z.string().min(2, "Location is required"),
})

export type AddShopInput = z.infer<typeof addShopSchema>