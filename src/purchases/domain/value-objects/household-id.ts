import { InvalidPurchaseError } from '../errors/purchase.errors';

export class HouseholdId {
  private constructor(readonly value: string) {}

  static from(value: string): HouseholdId {
    const normalized = value.trim();
    if (!normalized) throw new InvalidPurchaseError('Household id is required.');
    return new HouseholdId(normalized);
  }
}
