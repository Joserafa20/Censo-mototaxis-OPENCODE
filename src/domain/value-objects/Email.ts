/**
 * Value Object: Email
 *
 * Validates email format and normalizes to lowercase.
 * Immutable — all transformations return new instances.
 */

export class Email {
  private static readonly EMAIL_REGEX =
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * Creates an Email instance after validation.
   * @throws {Error} if the email format is invalid
   */
  static create(raw: string): Email {
    const trimmed = raw.trim().toLowerCase();

    if (trimmed.length === 0) {
      throw new Error("Email cannot be empty");
    }

    if (trimmed.length > 254) {
      throw new Error("Email exceeds maximum length of 254 characters");
    }

    if (!Email.EMAIL_REGEX.test(trimmed)) {
      throw new Error(`Invalid email format: ${raw}`);
    }

    return new Email(trimmed);
  }

  /**
   * Attempts to create an Email; returns null on failure instead of throwing.
   */
  static tryCreate(raw: string): Email | null {
    try {
      return Email.create(raw);
    } catch {
      return null;
    }
  }

  /** Normalized email value (lowercase, trimmed). */
  get value(): string {
    return this._value;
  }

  /** Domain portion after the @. */
  get domain(): string {
    return this._value.split("@")[1]!;
  }

  /** Local portion before the @. */
  get localPart(): string {
    return this._value.split("@")[0]!;
  }

  equals(other: Email): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
