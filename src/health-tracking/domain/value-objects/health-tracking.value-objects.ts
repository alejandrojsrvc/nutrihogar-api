import Decimal from 'decimal.js';
import { InvalidHealthTrackingValueError } from '../errors/health-tracking.errors';

type StringId = string | { value: string };

function idValue(input: StringId, label: string): string {
  const value = typeof input === 'string' ? input : input?.value;
  if (typeof value !== 'string' || value.trim() === '') {
    throw new InvalidHealthTrackingValueError(`${label} is required.`);
  }
  return value;
}

export class BodyWeightEntryId {
  readonly value: string;
  constructor(value: string) { this.value = idValue(value, 'Body weight entry id'); }
  toString(): string { return this.value; }
  equals(other: BodyWeightEntryId): boolean { return this.value === other.value; }
}

export class BodyMeasurementEntryId {
  readonly value: string;
  constructor(value: string) { this.value = idValue(value, 'Body measurement entry id'); }
  toString(): string { return this.value; }
  equals(other: BodyMeasurementEntryId): boolean { return this.value === other.value; }
}

export class MeasurementConfigurationId {
  readonly value: string;
  constructor(value: string) { this.value = idValue(value, 'Measurement configuration id'); }
  toString(): string { return this.value; }
  equals(other: MeasurementConfigurationId): boolean { return this.value === other.value; }
}

function positiveDecimal(input: Decimal.Value, label: string): Decimal {
  let value: Decimal;
  try { value = new Decimal(input); } catch { throw new InvalidHealthTrackingValueError(`${label} must be a valid decimal.`); }
  if (!value.isFinite() || value.lte(0)) throw new InvalidHealthTrackingValueError(`${label} must be positive.`);
  return value;
}

export class BodyWeight {
  readonly value: Decimal;
  private constructor(value: Decimal) { this.value = new Decimal(value); }
  static from(value: Decimal.Value): BodyWeight { return new BodyWeight(positiveDecimal(value, 'Body weight')); }
  toDecimal(): Decimal { return new Decimal(this.value); }
}

export class BodyMeasurementValue {
  readonly value: Decimal;
  private constructor(value: Decimal) { this.value = new Decimal(value); }
  static from(value: Decimal.Value): BodyMeasurementValue { return new BodyMeasurementValue(positiveDecimal(value, 'Body measurement')); }
  toDecimal(): Decimal { return new Decimal(this.value); }
}

export type MeasurementTypeValue = 'WAIST' | 'HIPS' | 'CHEST' | 'ARM_LEFT' | 'ARM_RIGHT' | 'THIGH_LEFT' | 'THIGH_RIGHT' | 'NECK' | 'CALF_LEFT' | 'CALF_RIGHT' | 'CUSTOM';
export const MEASUREMENT_TYPES: readonly MeasurementTypeValue[] = ['WAIST', 'HIPS', 'CHEST', 'ARM_LEFT', 'ARM_RIGHT', 'THIGH_LEFT', 'THIGH_RIGHT', 'NECK', 'CALF_LEFT', 'CALF_RIGHT', 'CUSTOM'];

export class MeasurementType {
  readonly value: MeasurementTypeValue;
  private constructor(value: MeasurementTypeValue) { this.value = value; }
  static from(value: string): MeasurementType {
    if (!MEASUREMENT_TYPES.includes(value as MeasurementTypeValue)) throw new InvalidHealthTrackingValueError('Invalid measurement type.');
    return new MeasurementType(value as MeasurementTypeValue);
  }
}

export type MeasurementUnitValue = 'KG' | 'LB' | 'CM' | 'IN';
export class MeasurementUnit {
  readonly value: MeasurementUnitValue;
  private constructor(value: MeasurementUnitValue) { this.value = value; }
  static from(value: string): MeasurementUnit {
    if (!['KG', 'LB', 'CM', 'IN'].includes(value)) throw new InvalidHealthTrackingValueError('Invalid measurement unit.');
    return new MeasurementUnit(value as MeasurementUnitValue);
  }
  static kg(): MeasurementUnit { return new MeasurementUnit('KG'); }
  static lb(): MeasurementUnit { return new MeasurementUnit('LB'); }
  static cm(): MeasurementUnit { return new MeasurementUnit('CM'); }
  static inch(): MeasurementUnit { return new MeasurementUnit('IN'); }
  isWeight(): boolean { return this.value === 'KG' || this.value === 'LB'; }
  isLength(): boolean { return !this.isWeight(); }
}

export type MeasurementSourceValue = 'MANUAL' | 'IMPORTED' | 'DEVICE';
export class MeasurementSource {
  readonly value: MeasurementSourceValue;
  private constructor(value: MeasurementSourceValue) { this.value = value; }
  static from(value: string): MeasurementSource {
    if (!['MANUAL', 'IMPORTED', 'DEVICE'].includes(value)) throw new InvalidHealthTrackingValueError('Invalid measurement source.');
    return new MeasurementSource(value as MeasurementSourceValue);
  }
}

export class MeasurementRecordedAt {
  static readonly FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
  readonly value: Date;
  private constructor(value: Date) { this.value = new Date(value); }
  static from(value: Date | string, now: Date, toleranceMs = MeasurementRecordedAt.FUTURE_TOLERANCE_MS): MeasurementRecordedAt {
    const date = new Date(value);
    const reference = new Date(now);
    if (Number.isNaN(date.getTime()) || Number.isNaN(reference.getTime())) throw new InvalidHealthTrackingValueError('Recorded date must be valid.');
    if (date.getTime() > reference.getTime() + toleranceMs) throw new InvalidHealthTrackingValueError('Recorded date cannot be excessively in the future.');
    return new MeasurementRecordedAt(date);
  }
  toDate(): Date { return new Date(this.value); }
}
