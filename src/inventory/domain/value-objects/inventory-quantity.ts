import Decimal from 'decimal.js';
import { InvalidInventoryQuantityError } from '../errors/inventory.errors';

export class InventoryQuantity {
  private constructor(private readonly amount: Decimal) {}

  static from(value: Decimal.Value): InventoryQuantity {
    let amount: Decimal;
    try {
      amount = new Decimal(value);
    } catch {
      throw new InvalidInventoryQuantityError();
    }
    if (!amount.isFinite() || amount.isNegative()) throw new InvalidInventoryQuantityError();
    return new InventoryQuantity(amount);
  }

  toDecimal(): Decimal {
    return new Decimal(this.amount);
  }
}
