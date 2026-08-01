import Decimal from 'decimal.js';
import { InvalidPurchaseError } from '../errors/purchase.errors';

export class PurchaseTotal {
  private constructor(private readonly amount: Decimal) {}

  static from(value: Decimal.Value): PurchaseTotal {
    let amount: Decimal;
    try {
      amount = new Decimal(value);
    } catch {
      throw new InvalidPurchaseError('Purchase total must be a finite decimal.');
    }
    if (!amount.isFinite() || amount.isNegative())
      throw new InvalidPurchaseError('Purchase total cannot be negative.');
    return new PurchaseTotal(amount);
  }

  toDecimal(): Decimal {
    return new Decimal(this.amount);
  }
}
