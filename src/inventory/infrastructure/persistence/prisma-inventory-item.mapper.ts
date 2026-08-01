import Decimal from 'decimal.js';
import { InventoryItem } from '../../domain/entities/inventory-item';
import { PrismaInventoryMovementMapper } from './prisma-inventory-movement.mapper';
import { InventoryItemRecord } from './prisma-inventory.types';

export class PrismaInventoryItemMapper {
  static toDomain(record: InventoryItemRecord): InventoryItem {
    return InventoryItem.reconstitute(
      {
        ...record,
        currentQuantity: new Decimal(record.currentQuantity.toString()),
        minimumQuantity: record.minimumQuantity
          ? new Decimal(record.minimumQuantity.toString())
          : null,
      },
      record.movements.map((movement) => PrismaInventoryMovementMapper.toDomain(movement)),
    );
  }

  static toPersistence(item: InventoryItem) {
    const props = item.toProps();
    return {
      ...props,
      currentQuantity: props.currentQuantity.toString(),
      minimumQuantity: props.minimumQuantity?.toString() ?? null,
      movements: item.pendingMovements.map((movement) =>
        PrismaInventoryMovementMapper.toPersistence(movement),
      ),
    };
  }
}
