import { InvalidHealthTrackingValueError } from '../errors/health-tracking.errors';

type StringId = string | { value: string };

function idValue(input: StringId, label: string): string {
  const value = typeof input === 'string' ? input : input?.value;
  if (typeof value !== 'string' || value.trim() === '') {
    throw new InvalidHealthTrackingValueError(`${label} is required.`);
  }
  return value;
}

export class DigestiveSymptomEntryId {
  readonly value: string;
  constructor(value: string) {
    this.value = idValue(value, 'Digestive symptom entry id');
  }
  toString(): string {
    return this.value;
  }
}

export type DigestiveSymptomTypeValue =
  | 'GAS'
  | 'BLOATING'
  | 'ABDOMINAL_PAIN'
  | 'HEARTBURN'
  | 'NAUSEA'
  | 'DIARRHEA'
  | 'CONSTIPATION'
  | 'OTHER';

export const DIGESTIVE_SYMPTOM_TYPES: readonly DigestiveSymptomTypeValue[] = [
  'GAS',
  'BLOATING',
  'ABDOMINAL_PAIN',
  'HEARTBURN',
  'NAUSEA',
  'DIARRHEA',
  'CONSTIPATION',
  'OTHER',
];

export class DigestiveSymptomType {
  readonly value: DigestiveSymptomTypeValue;
  private constructor(value: DigestiveSymptomTypeValue) {
    this.value = value;
  }
  static from(value: string): DigestiveSymptomType {
    if (!DIGESTIVE_SYMPTOM_TYPES.includes(value as DigestiveSymptomTypeValue)) {
      throw new InvalidHealthTrackingValueError('Invalid digestive symptom type.');
    }
    return new DigestiveSymptomType(value as DigestiveSymptomTypeValue);
  }
}

export class SymptomIntensity {
  readonly value: number;
  private constructor(value: number) {
    this.value = value;
  }
  static from(value: number): SymptomIntensity {
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new InvalidHealthTrackingValueError('Symptom intensity must be between 1 and 5.');
    }
    return new SymptomIntensity(value);
  }
}

export class SymptomOccurredAt {
  static readonly FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
  readonly startAt: Date;
  readonly endAt: Date | null;
  private constructor(startAt: Date, endAt: Date | null) {
    this.startAt = new Date(startAt);
    this.endAt = endAt ? new Date(endAt) : null;
  }
  static from(
    startAt: Date | string,
    endAt: Date | string | null | undefined,
    now: Date,
    toleranceMs = SymptomOccurredAt.FUTURE_TOLERANCE_MS,
  ): SymptomOccurredAt {
    const start = new Date(startAt);
    const end = endAt == null ? null : new Date(endAt);
    const reference = new Date(now);
    if (
      Number.isNaN(start.getTime()) ||
      (end && Number.isNaN(end.getTime())) ||
      Number.isNaN(reference.getTime())
    ) {
      throw new InvalidHealthTrackingValueError('Symptom dates must be valid.');
    }
    if (end && end.getTime() < start.getTime()) {
      throw new InvalidHealthTrackingValueError('Symptom end cannot be before its start.');
    }
    if (
      start.getTime() > reference.getTime() + toleranceMs ||
      (end && end.getTime() > reference.getTime() + toleranceMs)
    ) {
      throw new InvalidHealthTrackingValueError(
        'Symptom dates cannot be excessively in the future.',
      );
    }
    return new SymptomOccurredAt(start, end);
  }
  durationMs(): number | null {
    return this.endAt ? this.endAt.getTime() - this.startAt.getTime() : null;
  }
}

export class SymptomDuration {
  readonly milliseconds: number | null;
  private constructor(milliseconds: number | null) {
    this.milliseconds = milliseconds;
  }
  static from(occurredAt: SymptomOccurredAt): SymptomDuration {
    return new SymptomDuration(occurredAt.durationMs());
  }
}

export type SymptomStatusValue = 'ACTIVE' | 'RESOLVED' | 'CORRECTED' | 'CANCELLED';
export type SymptomFoodLinkSourceValue = 'MEAL_SELECTED' | 'FOOD_FROM_MEAL' | 'MANUAL_HYPOTHESIS';

export class SymptomStatus {
  readonly value: SymptomStatusValue;
  private constructor(value: SymptomStatusValue) {
    this.value = value;
  }
  static active(): SymptomStatus {
    return new SymptomStatus('ACTIVE');
  }
  static from(value: SymptomStatusValue): SymptomStatus {
    return new SymptomStatus(value);
  }
}

export class MealId {
  readonly value: string;
  constructor(value: string) {
    this.value = idValue(value, 'Meal id');
  }
}

export class FoodId {
  readonly value: string;
  constructor(value: string) {
    this.value = idValue(value, 'Food id');
  }
}
