import { InvalidPurchaseError } from '../errors/purchase.errors';

export class StoreName {
  private constructor(readonly value: string) {}

  static from(value: string): StoreName {
    const normalized = value.trim();
    if (!normalized) throw new InvalidPurchaseError('Store name is required.');
    return new StoreName(normalized);
  }
}
