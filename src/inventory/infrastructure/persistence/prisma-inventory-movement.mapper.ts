import Decimal from 'decimal.js';
import { InventoryMovement } from '../../domain/entities/inventory-movement';
import { InventoryMovementRecord } from './prisma-inventory.types';

export class PrismaInventoryMovementMapper {
  static toDomain(record: InventoryMovementRecord): InventoryMovement {
    return InventoryMovement.create({
      ...record,
      quantity: new Decimal(record.quantity.toString()),
    });
  }

  static toPersistence(movement: InventoryMovement) {
    const props = movement.toProps();
    return { ...props, quantity: props.quantity.toString() };
  }
}
