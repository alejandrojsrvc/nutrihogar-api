import { InvalidPurchaseError } from '../errors/purchase.errors';

export class Currency {
  private constructor(readonly value: string) {}

  static from(value: string): Currency {
    const normalized = value.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalized))
      throw new InvalidPurchaseError('Currency must be a three-letter code.');
    return new Currency(normalized);
  }
}
