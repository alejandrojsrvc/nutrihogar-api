import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  InventoryItemStatus,
  InventoryItemType,
  InventoryMovementType,
  InventoryUnit,
} from '../../../domain/models/inventory.models';

export class InventoryItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  householdId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  foodId!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  preparedFoodLeftoverId!: string | null;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['FOOD', 'PREPARED_FOOD', 'CUSTOM'] })
  itemType!: InventoryItemType;

  @ApiProperty()
  currentQuantity!: number;

  @ApiProperty({ enum: ['GRAM', 'MILLILITER', 'UNIT'] })
  unit!: InventoryUnit;

  @ApiPropertyOptional({ nullable: true })
  minimumQuantity!: number | null;

  @ApiPropertyOptional({ nullable: true })
  location!: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  expiresAt!: Date | null;

  @ApiProperty({ enum: ['ACTIVE', 'DEPLETED', 'ARCHIVED'] })
  status!: InventoryItemStatus;

  @ApiProperty()
  version!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class InventoryItemListResponseDto {
  @ApiProperty({ type: InventoryItemResponseDto, isArray: true })
  items!: InventoryItemResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}

export class InventoryMovementResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  inventoryItemId!: string;

  @ApiProperty({
    enum: [
      'PURCHASE',
      'CONSUMPTION',
      'ADJUSTMENT_INCREASE',
      'ADJUSTMENT_DECREASE',
      'WASTE',
      'EXPIRATION',
      'PREPARATION_CONSUMPTION',
      'REMAINDER_RETURN',
      'MANUAL_ENTRY',
    ],
  })
  type!: InventoryMovementType;

  @ApiProperty()
  quantity!: number;

  @ApiProperty({ enum: ['GRAM', 'MILLILITER', 'UNIT'] })
  unit!: InventoryUnit;

  @ApiProperty({ format: 'date-time' })
  occurredAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  sourceType!: string | null;

  @ApiPropertyOptional({ nullable: true })
  sourceId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  reason!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  actorId!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}

export class InventoryMovementListResponseDto {
  @ApiProperty({ type: InventoryMovementResponseDto, isArray: true })
  items!: InventoryMovementResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}

export class InventorySyncOperationResponseDto {
  @ApiProperty() operationId!: string;
  @ApiProperty({ enum: ['APPLIED', 'CONFLICT'] }) status!: 'APPLIED' | 'CONFLICT';
  @ApiPropertyOptional({ nullable: true }) reason!: string | null;
  @ApiPropertyOptional({ nullable: true }) resultingVersion!: number | null;
  @ApiPropertyOptional({ type: InventoryItemResponseDto, nullable: true })
  snapshot!: InventoryItemResponseDto | null;
}

export class InventorySyncResponseDto {
  @ApiProperty({ type: InventorySyncOperationResponseDto, isArray: true })
  processed!: InventorySyncOperationResponseDto[];
  @ApiProperty({ type: InventorySyncOperationResponseDto, isArray: true })
  conflicts!: InventorySyncOperationResponseDto[];
  @ApiPropertyOptional({ type: InventoryItemResponseDto, nullable: true })
  snapshot!: InventoryItemResponseDto | null;
}
