import { DigestiveSymptomEntry } from './digestive-symptom-entry';
import {
  InvalidDigestiveSymptomStateError,
  InvalidHealthTrackingValueError,
} from '../errors/health-tracking.errors';

const now = new Date('2026-08-01T12:00:00.000Z');
const symptom = (overrides: Partial<Parameters<typeof DigestiveSymptomEntry.create>[0]> = {}) =>
  DigestiveSymptomEntry.create({
    id: 'symptom-1',
    adultProfileId: 'adult-1',
    type: 'BLOATING',
    intensity: 3,
    startAt: '2026-08-01T10:00:00.000Z',
    endAt: '2026-08-01T10:30:00.000Z',
    now,
    ...overrides,
  });

describe('DigestiveSymptomEntry', () => {
  it('validates the symptom identity, intensity, dates and OTHER name', () => {
    expect(symptom().durationMs).toBe(30 * 60 * 1000);
    expect(() => symptom({ intensity: 6 })).toThrow(InvalidHealthTrackingValueError);
    expect(() => symptom({ type: 'OTHER', name: ' ' })).toThrow(InvalidHealthTrackingValueError);
    expect(() => symptom({ type: 'BLOATING', name: 'custom' })).toThrow(
      InvalidHealthTrackingValueError,
    );
    expect(() => symptom({ endAt: '2026-08-01T09:59:00.000Z' })).toThrow(
      InvalidHealthTrackingValueError,
    );
    expect(() => symptom({ adultProfileId: ' ' })).toThrow(InvalidHealthTrackingValueError);
    expect(() => symptom({ startAt: '2026-08-01T12:06:00.000Z' })).toThrow(
      InvalidHealthTrackingValueError,
    );
  });

  it('transitions active symptoms and rejects changes after resolution or cancellation', () => {
    const resolved = symptom();
    resolved.resolve();
    expect(resolved.status).toBe('RESOLVED');
    expect(() => resolved.linkMeal('meal-1')).toThrow(InvalidDigestiveSymptomStateError);

    const cancelled = symptom({ id: 'symptom-2' });
    cancelled.cancel();
    expect(cancelled.status).toBe('CANCELLED');
    expect(() => cancelled.resolve()).toThrow(InvalidDigestiveSymptomStateError);
  });

  it('keeps optional meal links and food snapshots without inferring causality', () => {
    const entry = symptom();
    entry.linkMeal('meal-1');
    entry.linkMeal('meal-1');
    entry.linkFood({
      foodId: 'food-1',
      source: 'FOOD_FROM_MEAL',
      mealId: 'meal-1',
      snapshot: { name: 'Yogurt', quantity: 125 },
    });
    entry.linkFood({ foodId: 'food-2', source: 'MANUAL_HYPOTHESIS' });
    expect(entry.toProps().mealLinks).toEqual([{ mealId: 'meal-1' }]);
    expect(entry.toProps().foodLinks[0]).toMatchObject({
      foodId: 'food-1',
      source: 'FOOD_FROM_MEAL',
      snapshot: { name: 'Yogurt', quantity: 125 },
    });
    expect(() => entry.linkFood({ foodId: 'food-3', source: 'MEAL_SELECTED' })).toThrow(
      InvalidHealthTrackingValueError,
    );
    entry.unlinkMeal('meal-1');
    expect(entry.toProps().mealLinks).toHaveLength(0);
  });

  it('corrects by creating a new entry and preserves the original data and links', () => {
    const original = symptom();
    original.linkMeal('meal-1');
    const corrected = original.correct({
      id: 'symptom-2',
      type: 'ABDOMINAL_PAIN',
      intensity: 4,
      startAt: '2026-08-01T10:00:00.000Z',
      endAt: '2026-08-01T11:00:00.000Z',
      now,
    });
    expect(original.status).toBe('CORRECTED');
    expect(original.toProps().type).toBe('BLOATING');
    expect(original.toProps().mealLinks).toEqual([{ mealId: 'meal-1' }]);
    expect(corrected.correctedFromId).toBe('symptom-1');
    expect(corrected.toProps().type).toBe('ABDOMINAL_PAIN');
  });

  it('reconstitutes resolved history and notes without making it mutable', () => {
    const entry = DigestiveSymptomEntry.fromPersistence({
      ...symptom({ notes: 'after lunch' }).toProps(),
      status: 'RESOLVED',
      mealLinks: [{ mealId: 'meal-1' }],
      foodLinks: [],
    });
    expect(entry.toProps()).toMatchObject({ status: 'RESOLVED', notes: 'after lunch' });
    expect(() => entry.resolve()).toThrow(InvalidDigestiveSymptomStateError);
  });
});
