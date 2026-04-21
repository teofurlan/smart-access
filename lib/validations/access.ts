import { z } from "zod";

export const accessRequestSchema = z.object({
  uid: z.string().trim().min(1, "uid is required"),
});

export type AccessRequest = z.infer<typeof accessRequestSchema>;
