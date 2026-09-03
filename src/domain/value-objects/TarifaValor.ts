export class TarifaValor {
  private readonly _value: number;
  private constructor(v: number) { this._value = v; }
  static create(v: unknown): TarifaValor {
    const n = typeof v === "string" ? Number(v) : v as number;
    if (typeof n !== "number" || Number.isNaN(n) || !Number.isFinite(n)) throw new Error("INVALID_TARIFA");
    if (n <= 0) throw new Error("INVALID_TARIFA");
    // round to 2 decimals check
    return new TarifaValor(Math.round(n * 100) / 100);
  }
  get value(): number { return this._value; }
}
