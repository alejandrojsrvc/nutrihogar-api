import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InventoryItem } from '../../domain/entities/inventory-item';
import { InventoryMovement } from '../../domain/entities/inventory-movement';
import {
  DuplicateInventorySourceError,
  InventoryAccessDeniedError,
  InventoryAdminRequiredError,
  InventoryFoodNotAvailableError,
  InventoryItemNotFoundError,
  InvalidPreparationConsumptionError,
  PreparedBatchInventoryAlreadyAppliedError,
  PreparedBatchNotFinalizedForInventoryError,
  UnsupportedInventoryUnitError,
  PreparedInventoryItemTypeError,
  PreparedFoodLeftoverNotFoundError,
  PreparedInventoryProfileAccessError,
} from '../../application/errors/inventory-application.errors';
import {
  ArchivedInventoryItemError,
  DuplicateInventoryOperationError,
  InsufficientInventoryError,
  InvalidInventoryItemError,
  InvalidInventoryMovementError,
  InvalidInventoryQuantityError,
  InventoryVersionConflictError,
} from '../../domain/errors/inventory.errors';
import {
  InventoryItemListResponseDto,
  InventoryItemResponseDto,
  InventoryMovementListResponseDto,
  InventoryMovementResponseDto,
  InventorySyncOperationResponseDto,
  InventorySyncResponseDto,
} from './dto/inventory-response.dto';
import { InventoryItemProps } from '../../domain/models/inventory.models';
import { InventorySyncOperationResult } from '../../application/ports/inventory-repository.port';

export function toInventoryItemResponse(item: InventoryItem): InventoryItemResponseDto {
  const props = item.toProps();
  return toInventoryItemPropsResponse(props);
}

function toInventoryItemPropsResponse(props: InventoryItemProps): InventoryItemResponseDto {
  return {
    id: props.id,
    householdId: props.householdId,
    foodId: props.foodId,
    preparedFoodLeftoverId: props.preparedFoodLeftoverId,
    name: props.nameSnapshot,
    itemType: props.itemType,
    currentQuantity: props.currentQuantity.toNumber(),
    unit: props.unit,
    minimumQuantity: props.minimumQuantity?.toNumber() ?? null,
    location: props.location,
    expiresAt: props.expiresAt,
    status: props.status,
    version: props.version,
    createdAt: props.createdAt,
    updatedAt: props.updatedAt,
  };
}

function toSyncOperationResponse(
  result: InventorySyncOperationResult,
): InventorySyncOperationResponseDto {
  return {
    operationId: result.operationId,
    status: result.status,
    reason: result.reason,
    resultingVersion: result.resultingVersion,
    snapshot: result.snapshot ? toInventoryItemPropsResponse(result.snapshot) : null,
  };
}

export function toInventorySyncResponse(result: {
  processed: InventorySyncOperationResult[];
  conflicts: InventorySyncOperationResult[];
  snapshot: InventoryItemProps | null;
}): InventorySyncResponseDto {
  return {
    processed: result.processed.map(toSyncOperationResponse),
    conflicts: result.conflicts.map(toSyncOperationResponse),
    snapshot: result.snapshot ? toInventoryItemPropsResponse(result.snapshot) : null,
  };
}

export function toInventoryItemListResponse(result: {
  items: InventoryItem[];
  page: number;
  limit: number;
  total: number;
}): InventoryItemListResponseDto {
  return { ...result, items: result.items.map(toInventoryItemResponse) };
}

export function toInventoryMovementResponse(
  movement: InventoryMovement,
): InventoryMovementResponseDto {
  const props = movement.toProps();
  return {
    id: props.id,
    inventoryItemId: props.itemId,
    type: props.type,
    quantity: props.quantity.toNumber(),
    unit: props.unit,
    occurredAt: props.occurredAt,
    sourceType: props.sourceType,
    sourceId: props.sourceId,
    reason: props.reason,
    actorId: props.actorId,
    createdAt: props.createdAt,
  };
}

export function toInventoryMovementListResponse(result: {
  items: InventoryMovement[];
  page: number;
  limit: number;
  total: number;
}): InventoryMovementListResponseDto {
  return { ...result, items: result.items.map(toInventoryMovementResponse) };
}

export function rethrowInventoryHttpError(error: unknown): never {
  if (
    error instanceof InvalidInventoryItemError ||
    error instanceof InvalidInventoryMovementError ||
    error instanceof InvalidInventoryQuantityError ||
    error instanceof UnsupportedInventoryUnitError ||
    error instanceof PreparedInventoryItemTypeError
  ) {
    throw new BadRequestException(error.message);
  }
  if (
    error instanceof ArchivedInventoryItemError ||
    error instanceof DuplicateInventoryOperationError ||
    error instanceof DuplicateInventorySourceError ||
    error instanceof InsufficientInventoryError ||
    error instanceof InventoryVersionConflictError ||
    error instanceof PreparedBatchInventoryAlreadyAppliedError ||
    error instanceof PreparedBatchNotFinalizedForInventoryError
  ) {
    throw new ConflictException(error.message);
  }
  if (error instanceof InventoryAccessDeniedError || error instanceof InventoryAdminRequiredError) {
    throw new ForbiddenException(error.message);
  }
  if (error instanceof PreparedInventoryProfileAccessError)
    throw new ForbiddenException(error.message);
  if (
    error instanceof InventoryItemNotFoundError ||
    error instanceof InventoryFoodNotAvailableError ||
    error instanceof PreparedFoodLeftoverNotFoundError
  ) {
    throw new NotFoundException(error.message);
  }
  if (error instanceof InvalidPreparationConsumptionError)
    throw new BadRequestException(error.message);
  throw error;
}
