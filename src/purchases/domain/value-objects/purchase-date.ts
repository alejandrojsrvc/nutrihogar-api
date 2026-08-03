import { InvalidPurchaseError } from '../errors/purchase.errors';

export class PurchaseDate {
  private constructor(readonly value: Date) {}

  static from(value: Date): PurchaseDate {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new InvalidPurchaseError('Purchase date is invalid.');
    return new PurchaseDate(date);
  }
}
