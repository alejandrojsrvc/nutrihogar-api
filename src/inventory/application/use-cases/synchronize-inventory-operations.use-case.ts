import { requireHouseholdAccess } from '../inventory-access';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { InventoryItem } from '../../domain/entities/inventory-item';
import { InventoryMovementType, InventoryUnit } from '../../domain/models/inventory.models';
import {
  InventorySyncOperationResult,
  InventorySyncTransaction,
  InventorySyncUnitOfWork,
} from '../ports/inventory-repository.port';
import { toInventoryBaseQuantity } from '../inventory-quantity-converter';

export const SYNCHRONIZE_INVENTORY_OPERATIONS_USE_CASE = Symbol(
  'SynchronizeInventoryOperationsUseCase',
);

export type InventorySyncOperation =
  | {
      operationId: string;
      type: 'MOVEMENT';
      inventoryItemId: string;
      movementType: Extract<
        InventoryMovementType,
        'PURCHASE' | 'CONSUMPTION' | 'WASTE' | 'EXPIRATION' | 'REMAINDER_RETURN'
      >;
      quantity: number | string;
      unit: InventoryUnit;
      occurredAt: Date;
      baseVersion: number;
    }
  | {
      operationId: string;
      type: 'ABSOLUTE_ADJUSTMENT';
      inventoryItemId: string;
      newQuantity: number | string;
      unit: InventoryUnit;
      occurredAt: Date;
      baseVersion: number;
      allowLastWriteWins?: boolean;
    };

export interface SynchronizeInventoryOperationsCommand {
  actorId: string;
  householdId: string;
  deviceId: string;
  operations: InventorySyncOperation[];
}

export interface SynchronizeInventoryOperationsResult {
  processed: InventorySyncOperationResult[];
  conflicts: InventorySyncOperationResult[];
  snapshot: ReturnType<InventoryItem['toProps']> | null;
}

export class SynchronizeInventoryOperationsUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly sync: InventorySyncUnitOfWork,
  ) {}

  async execute(
    command: SynchronizeInventoryOperationsCommand,
  ): Promise<SynchronizeInventoryOperationsResult> {
    const processed: InventorySyncOperationResult[] = [];
    const conflicts: InventorySyncOperationResult[] = [];
    let latestSnapshot: ReturnType<InventoryItem['toProps']> | null = null;

    for (const operation of command.operations) {
      const result = await this.sync.execute(async (transaction) => {
        const replay = await transaction.findOperation(operation.operationId);
        if (replay) return replay;

        let item: InventoryItem | null = null;
        try {
          await requireHouseholdAccess(this.households, command.actorId, command.householdId);
          item = await transaction.findById(operation.inventoryItemId);
          if (!item || item.householdId !== command.householdId) throw new Error('ITEM_NOT_FOUND');
          if (item.status === 'ARCHIVED') throw new Error('ARCHIVED');

          const metadata = {
            occurredAt: operation.occurredAt,
            actorId: command.actorId,
            deviceId: command.deviceId,
            syncOperationId: operation.operationId,
            sourceType: 'DEVICE_SYNC',
            sourceId: operation.operationId,
          };
          if (operation.type === 'MOVEMENT') {
            const quantity = toInventoryBaseQuantity(operation.quantity, operation.unit, item.unit);
            switch (operation.movementType) {
              case 'PURCHASE':
                item.registerPurchase(quantity, metadata);
                break;
              case 'CONSUMPTION':
                item.consume(quantity, metadata);
                break;
              case 'WASTE':
                item.registerWaste(quantity, metadata);
                break;
              case 'EXPIRATION':
                item.registerExpiration(quantity, metadata);
                break;
              case 'REMAINDER_RETURN':
                item.returnRemainder(quantity, metadata);
                break;
            }
          } else {
            if (operation.allowLastWriteWins) throw new Error('LAST_WRITE_WINS_NOT_ALLOWED');
            if (operation.baseVersion !== item.version) throw new Error('STALE_VERSION');
            item.adjustTo(
              toInventoryBaseQuantity(operation.newQuantity, operation.unit, item.unit),
              metadata,
            );
          }
          await transaction.save(item);
          return this.record(transaction, command, operation, 'APPLIED', null, item);
        } catch (error) {
          return this.record(
            transaction,
            command,
            operation,
            'CONFLICT',
            conflictReason(error),
            item,
          );
        }
      });
      if (result.status === 'APPLIED') processed.push(result);
      else conflicts.push(result);
      if (result.snapshot) latestSnapshot = result.snapshot;
    }
    return { processed, conflicts, snapshot: latestSnapshot };
  }

  private async record(
    transaction: InventorySyncTransaction,
    command: SynchronizeInventoryOperationsCommand,
    operation: InventorySyncOperation,
    status: 'APPLIED' | 'CONFLICT',
    reason: string | null,
    item: InventoryItem | null,
  ): Promise<InventorySyncOperationResult> {
    const result: InventorySyncOperationResult = {
      operationId: operation.operationId,
      householdId: command.householdId,
      inventoryItemId: operation.inventoryItemId,
      status,
      conflictCode: status === 'CONFLICT' ? conflictCode(errorReason(reason)) : null,
      retryable: status === 'CONFLICT' && isRetryableConflict(errorReason(reason)),
      reason,
      resultingVersion: item?.version ?? null,
      snapshot: item?.toProps() ?? null,
      deviceId: command.deviceId,
      actorId: command.actorId,
      createdAt: new Date(),
    };
    await transaction.recordOperation(result);
    return result;
  }
}

function conflictReason(error: unknown): string {
  if (error instanceof Error && error.message !== 'ITEM_NOT_FOUND') return error.message;
  return 'ITEM_NOT_FOUND';
}

function errorReason(reason: string | null): string {
  return reason ?? '';
}

function conflictCode(reason: string): InventorySyncOperationResult['conflictCode'] {
  if (reason.includes('negative')) return 'INSUFFICIENT_BALANCE';
  if (reason.includes('Archived')) return 'ARCHIVED_ITEM';
  if (reason.includes('incompatible')) return 'INCOMPATIBLE_UNIT';
  if (reason.includes('accessible')) return 'FORBIDDEN';
  return 'RETRYABLE';
}

function isRetryableConflict(reason: string): boolean {
  return reason === 'STALE_VERSION' || reason === 'LAST_WRITE_WINS_NOT_ALLOWED';
}
