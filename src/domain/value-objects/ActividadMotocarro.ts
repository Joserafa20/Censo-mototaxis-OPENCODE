export class ActividadMotocarro {
  private readonly _value: string;
  private constructor(v: string) { this._value = v; }
  static create(v: unknown): ActividadMotocarro {
    if (typeof v !== "string") throw new Error("REQUIRED_ACTIVIDAD");
    const t = v.trim();
    if (t.length < 2) throw new Error("REQUIRED_ACTIVIDAD");
    if (t.length > 150) throw new Error("REQUIRED_ACTIVIDAD");
    return new ActividadMotocarro(t);
  }
  get value(): string { return this._value; }
}
