import Decimal from 'decimal.js';
import {
  InvalidRemainderWeightError,
  RemainderAlreadyRecordedError,
  RemainderExceedsServedWeightError,
  ServedPortionAlreadyConsumedError,
  ServedPortionCancelledError,
} from '../errors/served-portion.errors';
import { ServedPortion } from './served-portion';

describe('ServedPortion', () => {
  it('creates a positive served portion', () => {
    const portion = createPortion();

    expect(portion.status).toBe('SERVED');
    expect(portion.servedWeight.equals(520)).toBe(true);
    expect(portion.consumedWeight).toBeNull();
  });

  it('records a partial remainder and calculates consumed weight', () => {
    const portion = createPortion();
    portion.recordRemainder(40, 'SAVED', at('2026-07-31T12:30:00Z'));

    expect(portion.remainder?.weight.equals(40)).toBe(true);
    expect(portion.consumedWeight?.equals(480)).toBe(true);
    expect(portion.status).toBe('SERVED');
  });

  it('allows a total remainder and zero consumption', () => {
    const portion = createPortion();
    portion.recordRemainder(520, 'DISCARDED', at('2026-07-31T12:30:00Z'));
    portion.confirmConsumption([], at('2026-07-31T12:31:00Z'));

    expect(portion.status).toBe('CONSUMED');
    expect(portion.consumedWeight?.equals(0)).toBe(true);
  });

  it('rejects an invalid or repeated remainder', () => {
    const portion = createPortion();
    expect(() => portion.recordRemainder(-1, 'SAVED', at('2026-07-31T12:30:00Z'))).toThrow(
      InvalidRemainderWeightError,
    );
    expect(() => portion.recordRemainder(521, 'SAVED', at('2026-07-31T12:30:00Z'))).toThrow(
      RemainderExceedsServedWeightError,
    );

    portion.recordRemainder(40, 'SAVED', at('2026-07-31T12:30:00Z'));
    expect(() => portion.recordRemainder(10, 'DISCARDED', at('2026-07-31T12:31:00Z'))).toThrow(
      RemainderAlreadyRecordedError,
    );
  });

  it('confirms consumption once and preserves its nutrient snapshot', () => {
    const portion = createPortion();
    const nutrients = [
      { code: 'ENERGY_KCAL', name: 'Energy', unit: 'kcal', amount: new Decimal(700) },
    ];
    portion.confirmConsumption(nutrients, at('2026-07-31T12:30:00Z'), 'meal-id');

    expect(portion.status).toBe('CONSUMED');
    expect(portion.consumedWeight?.equals(520)).toBe(true);
    expect(portion.mealId).toBe('meal-id');
    expect(portion.nutritionSnapshot[0]?.amount.equals(700)).toBe(true);
    expect(() => portion.confirmConsumption([], at('2026-07-31T12:31:00Z'))).toThrow(
      ServedPortionAlreadyConsumedError,
    );
  });

  it('cancels a served portion and blocks later operations', () => {
    const portion = createPortion();
    portion.cancel(at('2026-07-31T12:30:00Z'));

    expect(portion.status).toBe('CANCELLED');
    expect(() => portion.recordRemainder(0, 'SAVED', at('2026-07-31T12:31:00Z'))).toThrow(
      ServedPortionCancelledError,
    );
    expect(() => portion.cancel(at('2026-07-31T12:31:00Z'))).toThrow(ServedPortionCancelledError);
  });
});

function createPortion() {
  return ServedPortion.create({
    id: 'portion-id',
    preparedBatchId: 'batch-id',
    adultProfileId: 'profile-id',
    servedWeight: 520,
    servedAt: at('2026-07-31T12:00:00Z'),
    createdById: 'user-id',
    createdAt: at('2026-07-31T12:00:00Z'),
    updatedAt: at('2026-07-31T12:00:00Z'),
  });
}

function at(value: string) {
  return new Date(value);
}
