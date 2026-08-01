import { InvalidPurchaseError } from '../errors/purchase.errors';

export class PurchaseId {
  private constructor(readonly value: string) {}

  static from(value: string): PurchaseId {
    const normalized = value.trim();
    if (!normalized) throw new InvalidPurchaseError('Purchase id is required.');
    return new PurchaseId(normalized);
  }
}
