/**
 * Value Object: MotorcyclePlate
 *
 * Validates Colombian motorcycle plate format.
 * Accepts: ABC123 (3 letters + 3 digits) or AB123C (2 letters + 3 digits + 1 letter).
 * Immutable — all transformations return new instances.
 */

export class MotorcyclePlate {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * Creates a MotorcyclePlate instance after validation.
   * @throws {Error} if the plate format is invalid
   */
  static create(value: string): MotorcyclePlate {
    if (!value || typeof value !== "string") {
      throw new Error("Motorcycle plate is required");
    }

    const trimmed = value.trim().toUpperCase();

    // Format 1: ABC123 (3 letters + 3 digits)
    // Format 2: AB123C (2 letters + 3 digits + 1 letter)
    const validFormat = /^[A-Z]{3}\d{3}$/.test(trimmed) || /^[A-Z]{2}\d{3}[A-Z]$/.test(trimmed);

    if (!validFormat) {
      throw new Error(
        "Invalid motorcycle plate format. Expected ABC123 or AB123C"
      );
    }

    return new MotorcyclePlate(trimmed);
  }

  get value(): string {
    return this._value;
  }

  equals(other: MotorcyclePlate): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
