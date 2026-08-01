/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method */

import { FoodDetailView } from '../../food-catalog/application/models/food-catalog.models';
import { FoodCatalogReadRepository } from '../../food-catalog/application/ports/food-catalog-read-repository.port';
import { HouseholdRepository } from '../../households/application/ports/household-repository.port';
import { InventoryItem } from '../domain/entities/inventory-item';
import {
  DuplicateInventorySourceError,
  InventoryAccessDeniedError,
  InventoryAdminRequiredError,
  InventoryFoodNotAvailableError,
  UnsupportedInventoryUnitError,
} from './errors/inventory-application.errors';
import { InsufficientInventoryError } from '../domain/errors/inventory.errors';
import { GetInventoryItemQuery } from './queries/get-inventory-item.query';
import { ListInventoryItemsQuery } from './queries/list-inventory-items.query';
import { ListInventoryMovementsQuery } from './queries/list-inventory-movements.query';
import {
  InventoryItemRepository,
  InventoryMovementRepository,
} from './ports/inventory-repository.port';
import { AdjustInventoryItemUseCase } from './use-cases/adjust-inventory-item.use-case';
import { ArchiveInventoryItemUseCase } from './use-cases/archive-inventory-item.use-case';
import { ConsumeInventoryItemUseCase } from './use-cases/consume-inventory-item.use-case';
import { CreateManualInventoryItemUseCase } from './use-cases/create-manual-inventory-item.use-case';
import { RegisterInventoryExpirationUseCase } from './use-cases/register-inventory-expiration.use-case';
import { RegisterInventoryWasteUseCase } from './use-cases/register-inventory-waste.use-case';
import { SetInventoryMinimumUseCase } from './use-cases/set-inventory-minimum.use-case';

const actorId = '00000000-0000-4000-8000-000000000001';
const householdId = '00000000-0000-4000-8000-000000000002';
const itemId = '00000000-0000-4000-8000-000000000003';
const foodId = '00000000-0000-4000-8000-000000000004';
const now = new Date('2026-07-31T12:00:00.000Z');

describe('Inventory application', () => {
  let households: jest.Mocked<HouseholdRepository>;
  let inventory: jest.Mocked<InventoryItemRepository>;
  let movements: jest.Mocked<InventoryMovementRepository>;
  let foods: jest.Mocked<FoodCatalogReadRepository>;

  beforeEach(() => {
    households = {
      findAccess: jest.fn().mockResolvedValue(access('ADMIN')),
      findActiveForUser: jest.fn(),
      updateName: jest.fn(),
    };
    inventory = {
      findById: jest.fn(),
      findBySource: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
      listByHousehold: jest.fn().mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 }),
    };
    movements = {
      existsBySyncOperationId: jest.fn(),
      listByItem: jest.fn().mockResolvedValue({ items: [], page: 2, limit: 10, total: 0 }),
    };
    foods = {
      findVisibleById: jest.fn().mockResolvedValue(food()),
      search: jest.fn(),
      listCategories: jest.fn(),
      listNutrients: jest.fn(),
    };
  });

  it('lists and gets inventory only after active household access', async () => {
    const item = createItem();
    inventory.findById.mockResolvedValue(item);
    households.findAccess.mockResolvedValue(access('MEMBER'));
    const filters = {
      query: 'rice',
      belowMinimum: true,
      expiresBefore: new Date('2026-08-01T00:00:00.000Z'),
      page: 1,
      limit: 20,
    };

    await new ListInventoryItemsQuery(households, inventory).execute(actorId, householdId, filters);
    await expect(
      new GetInventoryItemQuery(households, inventory).execute(actorId, itemId),
    ).resolves.toBe(item);
    await new ListInventoryMovementsQuery(households, inventory, movements).execute(
      actorId,
      itemId,
      { page: 2, limit: 10 },
    );

    expect(inventory.listByHousehold).toHaveBeenCalledWith(householdId, filters);
    expect(movements.listByItem).toHaveBeenCalledWith(itemId, { page: 2, limit: 10 });
    expect(households.findAccess).toHaveBeenCalledWith(actorId, householdId);
  });

  it('uses the item household to isolate detail and movement access', async () => {
    inventory.findById.mockResolvedValue(createItem());
    households.findAccess.mockResolvedValue(null);

    await expect(
      new ListInventoryMovementsQuery(households, inventory, movements).execute(actorId, itemId, {
        page: 2,
        limit: 10,
      }),
    ).rejects.toBeInstanceOf(InventoryAccessDeniedError);
    expect(movements.listByItem).not.toHaveBeenCalled();
  });

  it('creates only visible non-prepared food for an administrator', async () => {
    const result = await new CreateManualInventoryItemUseCase(households, foods, inventory).execute(
      {
        actorId,
        householdId,
        foodId,
        quantity: 5,
        unit: 'GRAM',
        occurredAt: now,
        reason: 'Initial count',
      },
    );

    expect(result.foodId).toBe(foodId);
    expect(result.itemType).toBe('FOOD');
    expect(result.movements[0].toProps()).toEqual(
      expect.objectContaining({
        type: 'MANUAL_ENTRY',
        actorId,
        sourceType: 'MANUAL_ENTRY',
        reason: 'Initial count',
      }),
    );
    expect(inventory.findBySource).toHaveBeenCalledWith(
      householdId,
      { foodId },
      { unit: 'GRAM', location: null, expiresAt: null },
    );
    expect(inventory.save).toHaveBeenCalledWith(result);
  });

  it('rejects duplicate, prepared and cross-household manual food sources', async () => {
    inventory.findBySource.mockResolvedValue(createItem());
    const useCase = new CreateManualInventoryItemUseCase(households, foods, inventory);
    const command = {
      actorId,
      householdId,
      foodId,
      quantity: 1,
      unit: 'GRAM' as const,
      occurredAt: now,
    };
    await expect(useCase.execute(command)).rejects.toBeInstanceOf(DuplicateInventorySourceError);

    inventory.findBySource.mockResolvedValue(null);
    foods.findVisibleById.mockResolvedValue({ ...food(), foodType: 'PREPARED' });
    await expect(useCase.execute(command)).rejects.toBeInstanceOf(InventoryFoodNotAvailableError);

    foods.findVisibleById.mockResolvedValue({ ...food(), isGlobal: false, householdId: 'other' });
    await expect(useCase.execute(command)).rejects.toBeInstanceOf(InventoryFoodNotAvailableError);
  });

  it('requires ADMIN for absolute adjustment, metadata and archive', async () => {
    inventory.findById.mockResolvedValue(createItem());
    households.findAccess.mockResolvedValue(access('MEMBER'));

    await expect(
      new AdjustInventoryItemUseCase(households, inventory).execute({
        actorId,
        inventoryItemId: itemId,
        quantity: 3,
        unit: 'GRAM',
        reason: 'Count',
        occurredAt: now,
      }),
    ).rejects.toBeInstanceOf(InventoryAdminRequiredError);
    await expect(
      new SetInventoryMinimumUseCase(households, inventory).execute({
        actorId,
        inventoryItemId: itemId,
        minimumQuantity: 2,
        occurredAt: now,
      }),
    ).rejects.toBeInstanceOf(InventoryAdminRequiredError);
    await expect(
      new ArchiveInventoryItemUseCase(households, inventory).execute(actorId, itemId, now),
    ).rejects.toBeInstanceOf(InventoryAdminRequiredError);
    expect(inventory.save).not.toHaveBeenCalled();
  });

  it('records an absolute adjustment as a signed difference with audit metadata', async () => {
    const item = createItem(5);
    inventory.findById.mockResolvedValue(item);

    await new AdjustInventoryItemUseCase(households, inventory).execute({
      actorId,
      inventoryItemId: itemId,
      quantity: 2,
      unit: 'GRAM',
      reason: 'Physical count',
      occurredAt: now,
    });

    expect(item.currentQuantity.eq(2)).toBe(true);
    expect(item.pendingMovements.at(-1)?.toProps()).toEqual(
      expect.objectContaining({
        type: 'ADJUSTMENT_DECREASE',
        quantity: expect.objectContaining({}),
        actorId,
        reason: 'Physical count',
      }),
    );
    expect(item.pendingMovements.at(-1)?.quantity.eq(-3)).toBe(true);
  });

  it('updates metadata without changing quantity or creating a movement', async () => {
    const item = createItem();
    inventory.findById.mockResolvedValue(item);
    const movementCount = item.movements.length;

    await new SetInventoryMinimumUseCase(households, inventory).execute({
      actorId,
      inventoryItemId: itemId,
      minimumQuantity: 3,
      location: 'Freezer',
      expiresAt: new Date('2026-08-10T00:00:00.000Z'),
      occurredAt: now,
    });

    expect(item.minimumQuantity?.eq(3)).toBe(true);
    expect(item.location).toBe('Freezer');
    expect(item.currentQuantity.eq(5)).toBe(true);
    expect(item.movements).toHaveLength(movementCount);
  });

  it('archives an item without deleting its movement history', async () => {
    const item = createItem();
    inventory.findById.mockResolvedValue(item);
    const movementsBeforeArchive = [...item.movements];

    await new ArchiveInventoryItemUseCase(households, inventory).execute(actorId, itemId, now);

    expect(item.status).toBe('ARCHIVED');
    expect(item.movements).toEqual(movementsBeforeArchive);
    expect(inventory.save).toHaveBeenCalledWith(item);
  });

  it.each([
    ['CONSUMPTION', ConsumeInventoryItemUseCase],
    ['WASTE', RegisterInventoryWasteUseCase],
    ['EXPIRATION', RegisterInventoryExpirationUseCase],
  ] as const)(
    'allows active members to register %s distinctly and depletes at zero',
    async (type, UseCase) => {
      const item = createItem(2);
      inventory.findById.mockResolvedValue(item);
      households.findAccess.mockResolvedValue(access('MEMBER'));

      await new UseCase(households, inventory).execute({
        actorId,
        inventoryItemId: itemId,
        quantity: 2,
        unit: 'GRAM',
        reason: 'Manual exit',
        occurredAt: now,
      });

      expect(item.status).toBe('DEPLETED');
      expect(item.pendingMovements.at(-1)?.toProps()).toEqual(
        expect.objectContaining({ type, actorId, sourceType: `MANUAL_${type}` }),
      );
    },
  );

  it('rejects incompatible units and exits above availability', async () => {
    inventory.findById.mockResolvedValue(createItem(2));
    const useCase = new ConsumeInventoryItemUseCase(households, inventory);
    await expect(
      useCase.execute({
        actorId,
        inventoryItemId: itemId,
        quantity: 1,
        unit: 'UNIT',
        occurredAt: now,
      }),
    ).rejects.toBeInstanceOf(UnsupportedInventoryUnitError);
    await expect(
      useCase.execute({
        actorId,
        inventoryItemId: itemId,
        quantity: 3,
        unit: 'GRAM',
        occurredAt: now,
      }),
    ).rejects.toBeInstanceOf(InsufficientInventoryError);
  });
});

function access(role: 'ADMIN' | 'MEMBER') {
  return {
    household: {
      id: householdId,
      name: 'Home',
      timezone: 'UTC',
      currency: 'USD',
      weeklyBudget: null,
      createdById: actorId,
      createdAt: now,
      updatedAt: now,
    },
    role,
    status: 'ACTIVE' as const,
  };
}

function createItem(quantity = 5): InventoryItem {
  return InventoryItem.create({
    id: itemId,
    householdId,
    foodId,
    preparedFoodLeftoverId: null,
    nameSnapshot: 'Rice',
    itemType: 'FOOD',
    initialQuantity: quantity,
    unit: 'GRAM',
    createdAt: now,
    initialMovement: { occurredAt: now, sourceType: 'MANUAL_ENTRY', sourceId: foodId, actorId },
  });
}

function food(): FoodDetailView {
  return {
    id: foodId,
    householdId: null,
    name: 'Rice',
    brand: null,
    category: { id: 'category', code: 'GRAINS', name: 'Grains', displayOrder: 1 },
    foodType: 'GENERIC',
    preparationState: 'RAW',
    referenceQuantity: 100,
    referenceUnit: 'GRAM',
    energyKcal: 100,
    proteinGrams: 2,
    carbohydrateGrams: 20,
    fatGrams: 1,
    description: null,
    source: 'catalog',
    sourceReference: null,
    confidenceLevel: 'VERIFIED',
    isGlobal: true,
    nutrients: [],
    servings: [],
    aliases: [],
  };
}
