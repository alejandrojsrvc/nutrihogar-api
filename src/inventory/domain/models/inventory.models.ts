import Decimal from 'decimal.js';

export type InventoryUnit = 'GRAM' | 'MILLILITER' | 'UNIT';
export type InventoryItemType = 'FOOD' | 'PREPARED_FOOD' | 'CUSTOM';
export type InventoryItemStatus = 'ACTIVE' | 'DEPLETED' | 'ARCHIVED';
export type InventoryMovementType =
  | 'PURCHASE'
  | 'CONSUMPTION'
  | 'ADJUSTMENT_INCREASE'
  | 'ADJUSTMENT_DECREASE'
  | 'WASTE'
  | 'EXPIRATION'
  | 'PREPARATION_CONSUMPTION'
  | 'REMAINDER_RETURN'
  | 'MANUAL_ENTRY';

export interface InventoryMovementProps {
  id: string;
  itemId: string;
  type: InventoryMovementType;
  quantity: Decimal;
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

export interface InventoryItemProps {
  id: string;
  householdId: string;
  foodId: string | null;
  preparedFoodLeftoverId: string | null;
  nameSnapshot: string;
  itemType: InventoryItemType;
  currentQuantity: Decimal;
  unit: InventoryUnit;
  minimumQuantity: Decimal | null;
  location: string | null;
  expiresAt: Date | null;
  status: InventoryItemStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryMovementMetadata {
  id?: string;
  occurredAt: Date;
  sourceType?: string | null;
  sourceId?: string | null;
  reason?: string | null;
  actorId?: string | null;
  deviceId?: string | null;
  syncOperationId?: string | null;
  createdAt?: Date;
  type?: InventoryMovementType;
}

export interface CreateInventoryItemInput extends Omit<
  InventoryItemProps,
  | 'currentQuantity'
  | 'minimumQuantity'
  | 'location'
  | 'expiresAt'
  | 'status'
  | 'version'
  | 'createdAt'
  | 'updatedAt'
> {
  initialQuantity: Decimal.Value;
  minimumQuantity?: Decimal.Value | null;
  location?: string | null;
  expiresAt?: Date | null;
  createdAt: Date;
  initialMovement: InventoryMovementMetadata;
}
