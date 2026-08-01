import { InventoryItem } from '../../domain/entities/inventory-item';
import { InventoryMovement } from '../../domain/entities/inventory-movement';
import { CreateMealInput } from '../../../meal-tracking/application/ports/meal-repository.port';
import { MealView } from '../../../meal-tracking/domain/models/meal.models';
import {
  InventoryItemStatus,
  InventoryItemType,
  InventoryMovementType,
  InventoryUnit,
} from '../../domain/models/inventory.models';

export const INVENTORY_ITEM_REPOSITORY = Symbol('InventoryItemRepository');
export const INVENTORY_MOVEMENT_REPOSITORY = Symbol('InventoryMovementRepository');
export const PREPARATION_INVENTORY_UNIT_OF_WORK = Symbol('PreparationInventoryUnitOfWork');
export const PREPARED_INVENTORY_CONSUMPTION_UNIT_OF_WORK = Symbol(
  'PreparedInventoryConsumptionUnitOfWork',
);

export interface InventoryFilters {
  query?: string;
  status?: InventoryItemStatus;
  itemType?: InventoryItemType;
  foodId?: string;
  location?: string;
  belowMinimum?: boolean;
  expiresBefore?: Date;
  page: number;
  limit: number;
}

export interface MovementFilters {
  type?: InventoryMovementType;
  page: number;
  limit: number;
}

export interface PaginatedInventoryItems {
  items: InventoryItem[];
  page: number;
  limit: number;
  total: number;
}

export interface PaginatedInventoryMovements {
  items: InventoryMovement[];
  page: number;
  limit: number;
  total: number;
}

export type InventorySourceReference =
  | { foodId: string; preparedFoodLeftoverId?: never }
  | { foodId?: never; preparedFoodLeftoverId: string };

export interface InventorySourceCompatibility {
  unit: InventoryUnit;
  location: string | null;
  expiresAt: Date | null;
}

export interface InventoryItemRepository {
  findById(id: string): Promise<InventoryItem | null>;
  findBySource(
    householdId: string,
    source: InventorySourceReference,
    compatibility?: InventorySourceCompatibility,
  ): Promise<InventoryItem | null>;
  save(item: InventoryItem): Promise<void>;
  listByHousehold(householdId: string, filters: InventoryFilters): Promise<PaginatedInventoryItems>;
}

export interface PreparationInventoryCandidate {
  item: InventoryItem;
}

export interface PreparedBatchInventoryDecision {
  ingredientId: string;
  action: 'CONSUME' | 'IGNORE';
  inventoryItemId?: string;
  quantity: string;
  unit: InventoryUnit;
}

export interface PreparationInventoryUnitOfWork {
  findCandidates(
    householdId: string,
    foodId: string,
    unit: InventoryUnit,
  ): Promise<InventoryItem[]>;
  hasPreparedBatchConsumption(batchId: string): Promise<boolean>;
  confirmPreparedBatchConsumption(input: {
    householdId: string;
    batchId: string;
    actorId: string;
    decisions: PreparedBatchInventoryDecision[];
    occurredAt: Date;
  }): Promise<InventoryItem[]>;
  addPreparedLeftover(input: {
    householdId: string;
    leftoverId: string;
    batchId: string;
    name: string;
    quantity: string;
    location: string | null;
    minimumQuantity: string | null;
    expiresAt: Date | null;
    actorId: string;
    occurredAt: Date;
  }): Promise<InventoryItem>;
}

export interface PreparedInventoryConsumptionUnitOfWork {
  consume(input: {
    item: InventoryItem;
    meal: CreateMealInput;
  }): Promise<{ item: InventoryItem; meal: MealView }>;
}

export interface InventoryMovementRepository {
  existsBySyncOperationId(syncOperationId: string): Promise<boolean>;
  listByItem(
    inventoryItemId: string,
    filters: MovementFilters,
  ): Promise<PaginatedInventoryMovements>;
}
