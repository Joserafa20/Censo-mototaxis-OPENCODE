/**
 * Value Object: MototaxiCedula
 *
 * Validates Colombian cédula format.
 * Must be 6-12 digits only.
 * Immutable — all transformations return new instances.
 */

export class MototaxiCedula {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * Creates a MototaxiCedula instance after validation.
   * @throws {Error} if the cédula format is invalid
   */
  static create(value: string): MototaxiCedula {
    if (!value || typeof value !== "string") {
      throw new Error("Cédula is required");
    }

    const trimmed = value.trim();

    if (trimmed.length < 6 || trimmed.length > 12) {
      throw new Error("Cédula must be between 6 and 12 characters");
    }

    if (!/^\d+$/.test(trimmed)) {
      throw new Error("Cédula must contain only digits");
    }

    return new MototaxiCedula(trimmed);
  }

  get value(): string {
    return this._value;
  }

  equals(other: MototaxiCedula): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
