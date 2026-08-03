/* eslint-disable @typescript-eslint/require-await */

import { InventoryItem } from '../../domain/entities/inventory-item';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import {
  InventorySyncOperationResult,
  InventorySyncTransaction,
  InventorySyncUnitOfWork,
} from '../ports/inventory-repository.port';
import {
  InventorySyncOperation,
  SynchronizeInventoryOperationsUseCase,
} from './synchronize-inventory-operations.use-case';

describe('SynchronizeInventoryOperationsUseCase', () => {
  it('processes a mixed batch, preserves conflicts, and replays an applied operation', async () => {
    const item = itemWithQuantity(10);
    const sync = new InMemorySync(item);
    const useCase = new SynchronizeInventoryOperationsUseCase(activeHousehold(), sync);

    const command = {
      actorId: 'actor-1',
      householdId: 'household-1',
      deviceId: 'phone-1',
      operations: [
        operation('purchase-1', 'MOVEMENT', {
          movementType: 'PURCHASE',
          quantity: 2,
          baseVersion: 0,
        }),
        operation('consume-1', 'MOVEMENT', {
          movementType: 'CONSUMPTION',
          quantity: 50,
          baseVersion: 0,
        }),
        operation('adjust-1', 'ABSOLUTE_ADJUSTMENT', { newQuantity: 20, baseVersion: 0 }),
      ],
    };

    const first = await useCase.execute(command);
    expect(first.processed.map((result) => result.operationId)).toEqual(['purchase-1']);
    expect(first.conflicts.map((result) => result.reason)).toEqual([
      'Inventory quantity cannot become negative',
      'STALE_VERSION',
    ]);
    expect(sync.transactionCount).toBe(3);

    const replay = await useCase.execute({ ...command, operations: [command.operations[0]] });
    expect(replay.processed).toHaveLength(1);
    expect(item.currentQuantity.toString()).toBe('12');
    expect(
      item.movements.filter((movement) => movement.syncOperationId === 'purchase-1'),
    ).toHaveLength(1);
  });

  it('allows an accumulated operation with a stale base version and rejects archived or unauthorized items', async () => {
    const item = itemWithQuantity(4);
    const sync = new InMemorySync(item);
    const useCase = new SynchronizeInventoryOperationsUseCase(activeHousehold(), sync);

    await useCase.execute({
      actorId: 'actor-1',
      householdId: 'household-1',
      deviceId: 'phone-1',
      operations: [
        operation('purchase-1', 'MOVEMENT', {
          movementType: 'PURCHASE',
          quantity: 1,
          baseVersion: 0,
        }),
      ],
    });
    const staleAccumulated = await useCase.execute({
      actorId: 'actor-1',
      householdId: 'household-1',
      deviceId: 'phone-1',
      operations: [
        operation('consume-1', 'MOVEMENT', {
          movementType: 'CONSUMPTION',
          quantity: 1,
          baseVersion: 0,
        }),
      ],
    });
    expect(staleAccumulated.processed).toHaveLength(1);

    item.archive();
    const archived = await useCase.execute({
      actorId: 'actor-1',
      householdId: 'household-1',
      deviceId: 'phone-1',
      operations: [
        operation('archived-1', 'MOVEMENT', {
          movementType: 'PURCHASE',
          quantity: 1,
          baseVersion: 2,
        }),
      ],
    });
    expect(archived.conflicts[0].reason).toBe('ARCHIVED');

    const denied = await new SynchronizeInventoryOperationsUseCase(deniedHousehold(), sync).execute(
      {
        actorId: 'actor-1',
        householdId: 'household-1',
        deviceId: 'phone-1',
        operations: [
          operation('denied-1', 'MOVEMENT', {
            movementType: 'PURCHASE',
            quantity: 1,
            baseVersion: 3,
          }),
        ],
      },
    );
    expect(denied.conflicts).toHaveLength(1);
    expect(denied.conflicts[0].reason).toBe(
      'The inventory household is not accessible to the user.',
    );
  });
});

function itemWithQuantity(quantity: number): InventoryItem {
  const item = InventoryItem.create({
    id: 'item-1',
    householdId: 'household-1',
    foodId: null,
    preparedFoodLeftoverId: null,
    nameSnapshot: 'Rice',
    itemType: 'CUSTOM',
    initialQuantity: quantity,
    unit: 'GRAM',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    initialMovement: { occurredAt: new Date('2026-01-01T00:00:00Z') },
  });
  item.markPersisted(0);
  return item;
}

function operation(
  operationId: string,
  type: 'MOVEMENT' | 'ABSOLUTE_ADJUSTMENT',
  values: Record<string, unknown>,
): InventorySyncOperation {
  return {
    operationId,
    type,
    inventoryItemId: 'item-1',
    unit: 'GRAM',
    occurredAt: new Date('2026-01-02T00:00:00Z'),
    ...values,
  } as InventorySyncOperation;
}

function activeHousehold(): HouseholdRepository {
  return {
    findAccess: async () => ({ role: 'MEMBER', status: 'ACTIVE' }) as never,
    findActiveForUser: async () => [],
    updateName: async () => null,
  };
}

function deniedHousehold(): HouseholdRepository {
  return {
    findAccess: async () => null,
    findActiveForUser: async () => [],
    updateName: async () => null,
  };
}

class InMemorySync implements InventorySyncUnitOfWork {
  private readonly operations = new Map<string, InventorySyncOperationResult>();
  transactionCount = 0;
  constructor(private readonly item: InventoryItem) {}
  findOperation(operationId: string) {
    return Promise.resolve(this.operations.get(operationId) ?? null);
  }
  async execute<T>(work: (transaction: InventorySyncTransaction) => Promise<T>): Promise<T> {
    this.transactionCount += 1;
    return work({
      findById: async (id) => (id === this.item.id ? this.item : null),
      save: async (value) => value.markPersisted(value.version),
      findOperation: (id) => this.findOperation(id),
      recordOperation: async (result) => {
        this.operations.set(result.operationId, result);
      },
    });
  }
}
