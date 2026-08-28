/**
 * Value Object: Coordinates
 *
 * Validates GPS latitude and longitude values.
 * Immutable — all transformations return new instances.
 *
 * Valid ranges:
 * - Latitude: -90 to 90
 * - Longitude: -180 to 180
 */

import { InvalidCoordinatesError } from "../errors/GeographyErrors.js";

export class Coordinates {
  private readonly _latitude: number;
  private readonly _longitude: number;

  private constructor(latitude: number, longitude: number) {
    this._latitude = latitude;
    this._longitude = longitude;
  }

  /**
   * Creates a Coordinates instance after validation.
   * @throws {InvalidCoordinatesError} if coordinates are out of valid range
   */
  static create(latitude: number, longitude: number): Coordinates {
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      throw new InvalidCoordinatesError("Latitude and longitude must be numbers");
    }

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      throw new InvalidCoordinatesError("Latitude and longitude cannot be NaN");
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new InvalidCoordinatesError("Latitude and longitude must be finite numbers");
    }

    if (latitude < -90 || latitude > 90) {
      throw new InvalidCoordinatesError(
        `Latitude ${latitude} is out of range. Must be between -90 and 90`
      );
    }

    if (longitude < -180 || longitude > 180) {
      throw new InvalidCoordinatesError(
        `Longitude ${longitude} is out of range. Must be between -180 and 180`
      );
    }

    // Round to 6 decimal places (~1 meter precision)
    const roundedLat = Math.round(latitude * 1_000_000) / 1_000_000;
    const roundedLng = Math.round(longitude * 1_000_000) / 1_000_000;

    return new Coordinates(roundedLat, roundedLng);
  }

  /**
   * Attempts to create Coordinates; returns null on failure instead of throwing.
   */
  static tryCreate(latitude: number, longitude: number): Coordinates | null {
    try {
      return Coordinates.create(latitude, longitude);
    } catch {
      return null;
    }
  }

  get latitude(): number {
    return this._latitude;
  }

  get longitude(): number {
    return this._longitude;
  }

  equals(other: Coordinates): boolean {
    return this._latitude === other._latitude && this._longitude === other._longitude;
  }

  toString(): string {
    return `(${this._latitude}, ${this._longitude})`;
  }

  /** Returns a plain object representation for serialization. */
  toJSON(): { latitude: number; longitude: number } {
    return { latitude: this._latitude, longitude: this._longitude };
  }

  /** Creates a Coordinates instance from a plain object. */
  static fromJSON(data: { latitude: number; longitude: number }): Coordinates {
    return Coordinates.create(data.latitude, data.longitude);
  }
}
