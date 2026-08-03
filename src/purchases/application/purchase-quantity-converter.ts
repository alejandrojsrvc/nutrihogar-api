import Decimal from 'decimal.js';
import { InventoryUnit } from '../../inventory/domain/models/inventory.models';
import { PurchaseUnit } from '../domain/models/purchase.models';
import { PurchaseUnitConversionError } from './errors/purchase-application.errors';

export function normalizePurchaseQuantity(
  quantity: Decimal.Value,
  inputUnit: string,
  targetUnit?: InventoryUnit,
): { quantity: Decimal; unit: InventoryUnit } {
  const unit = inputUnit.trim().toUpperCase() as PurchaseUnit;
  if (!isPurchaseUnit(unit)) throw new PurchaseUnitConversionError();

  const outputUnit = targetUnit ?? canonicalUnitFor(unit);
  if (!outputUnit || canonicalUnitFor(unit) !== outputUnit) throw new PurchaseUnitConversionError();

  const factor = unit === 'KG' || unit === 'L' ? 1000 : 1;
  return { quantity: new Decimal(quantity).mul(factor), unit: outputUnit };
}

function isPurchaseUnit(unit: string): unit is PurchaseUnit {
  return ['GRAM', 'MILLILITER', 'UNIT', 'KG', 'G', 'L', 'ML', 'EA'].includes(unit);
}

function canonicalUnitFor(unit: PurchaseUnit): InventoryUnit | null {
  if (unit === 'KG' || unit === 'G' || unit === 'GRAM') return 'GRAM';
  if (unit === 'L' || unit === 'ML' || unit === 'MILLILITER') return 'MILLILITER';
  if (unit === 'UNIT' || unit === 'EA') return 'UNIT';
  return null;
}
