import { z } from "zod";
export const HorarioSchema = z.enum(["DIURNO", "NOCTURNO"]);
export type Horario = z.infer<typeof HorarioSchema>;
