/**
 * Value Object: PhoneNumber
 *
 * Validates and normalizes phone numbers to E.164-like format.
 * Supports Colombian mobile numbers (e.g., +57XXXXXXXXXX).
 * Immutable — all transformations return new instances.
 */

export class PhoneNumber {
  /**
   * Colombian phone number regex:
   * - Optional leading +
   * - 10 digits for local format (e.g., 3001234567)
   * - 12 digits for international format (e.g., 573001234567)
   */
  private static readonly PHONE_REGEX = /^(\+?57)?[3][0-9]{9}$/;

  private static readonly MAX_LENGTH = 20;

  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * Creates a PhoneNumber instance after validation.
   * Normalizes to format without spaces or dashes.
   * @throws {Error} if the phone number format is invalid
   */
  static create(raw: string): PhoneNumber {
    const cleaned = raw.replace(/[\s\-().]/g, "");

    if (cleaned.length === 0) {
      throw new Error("Phone number cannot be empty");
    }

    if (cleaned.length > PhoneNumber.MAX_LENGTH) {
      throw new Error(`Phone number exceeds maximum length of ${PhoneNumber.MAX_LENGTH} characters`);
    }

    if (!PhoneNumber.PHONE_REGEX.test(cleaned)) {
      throw new Error(`Invalid phone number format: ${raw}`);
    }

    return new PhoneNumber(cleaned);
  }

  /**
   * Attempts to create a PhoneNumber; returns null on failure instead of throwing.
   */
  static tryCreate(raw: string): PhoneNumber | null {
    try {
      return PhoneNumber.create(raw);
    } catch {
      return null;
    }
  }

  /** Normalized phone number value (digits only, no spaces/dashes). */
  get value(): string {
    return this._value;
  }

  /** Returns the phone number with + prefix. */
  get international(): string {
    return this._value.startsWith("+") ? this._value : `+${this._value}`;
  }

  equals(other: PhoneNumber): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
