import { z } from "zod";

export const VehicleTypeSchema = z.enum(["MOTO_FAMILIAR", "MOTOTAXI", "MOTOCARRO"]);
export type VehicleType = z.infer<typeof VehicleTypeSchema>;
export const VALID_VEHICLE_TYPES = VehicleTypeSchema.options as readonly VehicleType[];
export function isValidVehicleType(v: string): v is VehicleType {
  return (VALID_VEHICLE_TYPES as readonly string[]).includes(v);
}
