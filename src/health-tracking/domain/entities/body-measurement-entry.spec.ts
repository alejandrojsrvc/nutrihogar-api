import { BodyMeasurementEntry } from './body-measurement-entry';
import { InvalidHealthTrackingValueError } from '../errors/health-tracking.errors';

const now = new Date('2026-01-10T12:00:00.000Z');
const measurement = (overrides: Partial<Parameters<typeof BodyMeasurementEntry.create>[0]> = {}) => BodyMeasurementEntry.create({ id: 'measurement-1', adultProfileId: 'profile-1', type: 'WAIST', value: '85.2', unit: 'CM', recordedAt: now, source: 'MANUAL', now, ...overrides });

describe('BodyMeasurementEntry', () => {
  it('creates standard and custom measurements and allows same-day records', () => {
    const first = measurement();
    const second = measurement({ id: 'measurement-2', recordedAt: new Date('2026-01-10T18:00:00.000Z') });
    expect(first.toProps().type).toBe('WAIST');
    expect(second.toProps().id).toBe('measurement-2');
    expect(measurement({ type: 'CUSTOM', customMeasurementName: 'Upper arm' }).toProps().customMeasurementName).toBe('Upper arm');
  });

  it('validates positivity, length units and custom names', () => {
    expect(() => measurement({ value: -1 })).toThrow(InvalidHealthTrackingValueError);
    expect(() => measurement({ unit: 'KG' as 'CM' })).toThrow(InvalidHealthTrackingValueError);
    expect(() => measurement({ type: 'CUSTOM' })).toThrow(InvalidHealthTrackingValueError);
    expect(() => measurement({ customMeasurementName: 'unexpected' })).toThrow(InvalidHealthTrackingValueError);
  });

  it('preserves the original when corrected', () => {
    const original = measurement();
    const corrected = original.correct({ id: 'measurement-2', type: 'WAIST', value: '86', unit: 'CM', recordedAt: now, source: 'IMPORTED', now });
    expect(corrected.correctedFromId).toBe(original.id);
    expect(original.value.toString()).toBe('85.2');
    expect(corrected.toProps().source).toBe('IMPORTED');
  });
});
