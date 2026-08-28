export class RejectReason {
  private readonly _value: string;
  private constructor(value: string) {
    this._value = value;
  }
  static create(value: string): RejectReason {
    if (value == null || typeof value !== "string" || value.trim().length === 0) {
      const e: any = new Error("REJECT_REASON_REQUIRED: motive is required");
      e.code = "REJECT_REASON_REQUIRED";
      e.statusCode = 400;
      throw e;
    }
    const trimmed = value.trim();
    if (trimmed.length < 10) {
      const e: any = new Error("REJECT_REASON_TOO_SHORT: motive must be 10-500 chars");
      e.code = "REJECT_REASON_TOO_SHORT";
      e.statusCode = 400;
      throw e;
    }
    if (trimmed.length > 500) {
      const e: any = new Error("REJECT_REASON_TOO_LONG: motive must be 10-500 chars");
      e.code = "REJECT_REASON_TOO_LONG";
      e.statusCode = 400;
      throw e;
    }
    return new RejectReason(trimmed);
  }
  get value(): string { return this._value; }
  toString(): string { return this._value; }
}
