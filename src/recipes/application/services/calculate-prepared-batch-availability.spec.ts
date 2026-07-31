import Decimal from 'decimal.js';
import { calculatePreparedBatchAvailability } from './calculate-prepared-batch-availability';

describe('calculatePreparedBatchAvailability', () => {
  it('keeps decimal precision and subtracts stored leftovers exactly once', () => {
    const result = calculatePreparedBatchAvailability({
      finalCookedWeight: new Decimal('1650.123456'),
      servedWeight: new Decimal('900.111110'),
      storedLeftoverWeight: new Decimal('500.012345'),
      savedRemainderWeight: new Decimal('40.000001'),
      discardedWeight: new Decimal(0),
    });

    expect(result.availableWeight.toString()).toBe('250.000001');
    expect(result.savedRemainderWeight.toString()).toBe('40.000001');
  });

  it('never returns a negative available weight', () => {
    const result = calculatePreparedBatchAvailability({
      finalCookedWeight: new Decimal(100),
      servedWeight: new Decimal(80),
      storedLeftoverWeight: new Decimal(30),
      savedRemainderWeight: new Decimal(0),
      discardedWeight: new Decimal(0),
    });

    expect(result.availableWeight.equals(0)).toBe(true);
  });
});
