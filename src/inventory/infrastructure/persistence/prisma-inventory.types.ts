import {
  InventoryItemStatus,
  InventoryItemType,
  InventoryMovementType,
  InventoryUnit,
} from '../../domain/models/inventory.models';

export interface PrismaDecimalLike {
  toString(): string;
}

export interface InventoryMovementRecord {
  id: string;
  itemId: string;
  type: InventoryMovementType;
  quantity: PrismaDecimalLike;
  unit: InventoryUnit;
  occurredAt: Date;
  sourceType: string | null;
  sourceId: string | null;
  reason: string | null;
  actorId: string | null;
  deviceId: string | null;
  syncOperationId: string | null;
  createdAt: Date;
}

export interface InventoryItemRecord {
  id: string;
  householdId: string;
  foodId: string | null;
  preparedFoodLeftoverId: string | null;
  nameSnapshot: string;
  itemType: InventoryItemType;
  currentQuantity: PrismaDecimalLike;
  unit: InventoryUnit;
  minimumQuantity: PrismaDecimalLike | null;
  location: string | null;
  expiresAt: Date | null;
  status: InventoryItemStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  movements: InventoryMovementRecord[];
}
