import Decimal from 'decimal.js';
import { UnsupportedInventoryUnitError } from './errors/inventory-application.errors';
import { InventoryUnit } from '../domain/models/inventory.models';

export function toInventoryBaseQuantity(
  quantity: Decimal.Value,
  inputUnit: InventoryUnit,
  baseUnit: InventoryUnit,
): Decimal.Value {
  if (inputUnit !== baseUnit) throw new UnsupportedInventoryUnitError();
  return quantity;
}
