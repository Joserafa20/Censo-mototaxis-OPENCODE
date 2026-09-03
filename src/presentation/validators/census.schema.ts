import { z } from "zod";

const motoFamiliar = z.object({
  vehicleType: z.literal("MOTO_FAMILIAR"),
  documentosAlDia: z.boolean({ message: "REQUIRED_DOCUMENTOS" }),
});

const mototaxi = z.object({
  vehicleType: z.literal("MOTOTAXI"),
  ownershipType: z.enum(["PROPIA", "PAGA_TARIFA"], { message: "INVALID_OWNERSHIP" }),
  operationMode: z.enum(["ESTACION", "CIRCULANTE"], { message: "INVALID_OPERATION_MODE" }),
  stationId: z.string().nullable().optional(),
  tarifaValor: z.number().positive({ message: "INVALID_TARIFA" }).nullable().optional(),
  documentosAlDia: z.boolean({ message: "REQUIRED_DOCUMENTOS" }),
  horario: z.enum(["DIURNO", "NOCTURNO"], { message: "INVALID_HORARIO" }),
}).superRefine((v, ctx) => {
  if (v.operationMode === "ESTACION" && !v.stationId) ctx.addIssue({ code: "custom", path: ["stationId"], message: "STATION_NOT_ACTIVE" });
  if (v.ownershipType === "PAGA_TARIFA" && (v.tarifaValor == null || !(v.tarifaValor! > 0))) ctx.addIssue({ code: "custom", path: ["tarifaValor"], message: "INVALID_TARIFA" });
});

const motocarro = z.object({
  vehicleType: z.literal("MOTOCARRO"),
  ownershipType: z.enum(["PROPIA", "PAGA_TARIFA"], { message: "INVALID_OWNERSHIP" }),
  actividadMotocarro: z.string().trim().min(2, { message: "REQUIRED_ACTIVIDAD" }).max(150, { message: "REQUIRED_ACTIVIDAD" }),
  tarifaValor: z.number().positive({ message: "INVALID_TARIFA" }).nullable().optional(),
  documentosAlDia: z.boolean().nullable().optional(),
}).superRefine((v, ctx) => {
  if (v.ownershipType === "PAGA_TARIFA" && (v.tarifaValor == null || !(v.tarifaValor! > 0))) ctx.addIssue({ code: "custom", path: ["tarifaValor"], message: "INVALID_TARIFA" });
  if (v.ownershipType === "PAGA_TARIFA" && v.documentosAlDia == null) ctx.addIssue({ code: "custom", path: ["documentosAlDia"], message: "REQUIRED_DOCUMENTOS" });
});

export const censusVehicleSchema = z.discriminatedUnion("vehicleType", [motoFamiliar, mototaxi, motocarro]);

// Full create schema: base fields + vehicle discriminant
const baseFields = z.object({
  periodId: z.string().min(1),
  corregimientoId: z.string().min(1),
  neighborhoodId: z.string().nullable().optional(),
  stationId: z.string().nullable().optional(),
  operationType: z.enum(["station", "independent"]),
  mototaxiCedula: z.string().min(6).max(12),
  mototaxiFirstName: z.string().min(1),
  mototaxiLastName: z.string().min(1),
  mototaxiPhone: z.string().nullable().optional(),
  mototaxiAddress: z.string().nullable().optional(),
  motorcyclePlate: z.string().min(3),
  motorcycleBrand: z.string().min(1),
  motorcycleModel: z.string().min(1),
  motorcycleColor: z.string().min(1),
  motorcycleYear: z.number().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  consentGiven: z.boolean(),
  consentSignature: z.string().min(3).max(200),
});

export const censusCreateSchema = z.object({
  body: z.intersection(baseFields, censusVehicleSchema),
  params: z.object({}).passthrough().optional(),
  query: z.object({}).passthrough().optional(),
});
export const censusUpdateSchema = censusCreateSchema;

export type CensusVehicleInput = z.infer<typeof censusVehicleSchema>;
