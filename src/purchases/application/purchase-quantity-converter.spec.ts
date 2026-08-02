import Decimal from 'decimal.js';
import { InventoryUnit } from '../../inventory/domain/models/inventory.models';
import { PurchaseUnitConversionError } from './errors/purchase-application.errors';
import { normalizePurchaseQuantity } from './purchase-quantity-converter';

describe('normalizePurchaseQuantity', () => {
  it.each([
    ['KG', 'GRAM', '1', '1000'],
    ['G', 'GRAM', '2', '2'],
    ['L', 'MILLILITER', '1', '1000'],
    ['ML', 'MILLILITER', '2', '2'],
    ['UNIT', 'UNIT', '2', '2'],
    ['EA', 'UNIT', '2', '2'],
  ])('converts %s to %s', (inputUnit, targetUnit, quantity, expected) => {
    const result = normalizePurchaseQuantity(
      new Decimal(quantity),
      inputUnit,
      targetUnit as InventoryUnit,
    );

    expect(result.unit).toBe(targetUnit);
    expect(result.quantity.toString()).toBe(expected);
  });

  it.each([
    ['KG', 'MILLILITER'],
    ['L', 'GRAM'],
    ['BOX', 'UNIT'],
    ['PACK', 'UNIT'],
  ])('rejects incompatible or unknown unit %s', (inputUnit, targetUnit) => {
    expect(() => normalizePurchaseQuantity(1, inputUnit, targetUnit as InventoryUnit)).toThrow(
      PurchaseUnitConversionError,
    );
  });
});
