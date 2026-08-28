export type OperationType = "station" | "independent";

export const VALID_OPERATION_TYPES: readonly OperationType[] = ["station", "independent"] as const;

export function isValidOperationType(value: string): value is OperationType {
  return (VALID_OPERATION_TYPES as readonly string[]).includes(value);
}
