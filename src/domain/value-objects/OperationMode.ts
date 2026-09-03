import { z } from "zod";
export const OperationModeSchema = z.enum(["ESTACION", "CIRCULANTE"]);
export type OperationMode = z.infer<typeof OperationModeSchema>;
export const VALID_OPERATION_MODES = OperationModeSchema.options as readonly OperationMode[];
