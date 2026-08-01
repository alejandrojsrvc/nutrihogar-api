import Decimal from 'decimal.js';
import { BodyWeightEntry } from './body-weight-entry';
import { InvalidHealthTrackingValueError } from '../errors/health-tracking.errors';

const now = new Date('2026-01-10T12:00:00.000Z');
const weight = (overrides: Partial<Parameters<typeof BodyWeightEntry.create>[0]> = {}) =>
  BodyWeightEntry.create({
    id: 'weight-1',
    adultProfileId: 'profile-1',
    value: '72.50',
    unit: 'KG',
    recordedAt: now,
    source: 'MANUAL',
    now,
    ...overrides,
  });

describe('BodyWeightEntry', () => {
  it('creates a positive decimal weight and copies mutable values', () => {
    const entry = weight();
    expect(entry.value.equals(new Decimal('72.50'))).toBe(true);
    const props = entry.toProps();
    props.value = new Decimal(1);
    props.recordedAt.setFullYear(2000);
    expect(entry.value.equals(new Decimal('72.50'))).toBe(true);
    expect(entry.toProps().recordedAt.getFullYear()).toBe(2026);
  });

  it('rejects invalid values, units, profile and excessive future dates', () => {
    expect(() => weight({ value: 0 })).toThrow(InvalidHealthTrackingValueError);
    expect(() => weight({ unit: 'CM' as 'KG' })).toThrow(InvalidHealthTrackingValueError);
    expect(() => weight({ adultProfileId: ' ' })).toThrow(InvalidHealthTrackingValueError);
    expect(() => weight({ recordedAt: new Date(now.getTime() + 6 * 60 * 1000) })).toThrow(
      InvalidHealthTrackingValueError,
    );
    expect(() => weight({ recordedAt: 'not-a-date' })).toThrow(InvalidHealthTrackingValueError);
  });

  it('corrects by creating a related record without changing history', () => {
    const original = weight();
    const corrected = original.correct({
      id: 'weight-2',
      value: '73',
      unit: 'KG',
      recordedAt: now,
      source: 'MANUAL',
      now,
    });
    expect(corrected.id).toBe('weight-2');
    expect(corrected.correctedFromId).toBe('weight-1');
    expect(original.correctedFromId).toBeNull();
    expect(original.value.equals(new Decimal('72.50'))).toBe(true);
  });
});
