import { z } from "zod";
export const OwnershipTypeSchema = z.enum(["PROPIA", "PAGA_TARIFA"]);
export type OwnershipType = z.infer<typeof OwnershipTypeSchema>;
export const VALID_OWNERSHIP_TYPES = OwnershipTypeSchema.options as readonly OwnershipType[];
