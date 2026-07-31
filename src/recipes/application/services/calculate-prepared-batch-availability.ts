import Decimal from 'decimal.js';
import { PreparedBatchAvailability } from '../ports/served-portion-repository.port';

export interface PreparedBatchAvailabilityInput {
  finalCookedWeight: Decimal;
  servedWeight: Decimal;
  storedLeftoverWeight: Decimal;
  savedRemainderWeight: Decimal;
  discardedWeight: Decimal;
}

export function calculatePreparedBatchAvailability(
  input: PreparedBatchAvailabilityInput,
): PreparedBatchAvailability {
  const availableWeight = input.finalCookedWeight
    .sub(input.servedWeight)
    .sub(input.storedLeftoverWeight);

  return {
    ...input,
    availableWeight: availableWeight.gt(0) ? availableWeight : new Decimal(0),
  };
}
