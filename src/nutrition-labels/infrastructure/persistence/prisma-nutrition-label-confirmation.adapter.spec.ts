/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/unbound-method */
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';
import { ConfirmNutritionLabelTransactionInput } from '../../application/ports/nutrition-label-confirmation.port';
import { NutritionLabelTargetFoodNotAllowedError } from '../../application/errors/nutrition-label.errors';
import { PrismaNutritionLabelConfirmationAdapter } from './prisma-nutrition-label-confirmation.adapter';

describe('PrismaNutritionLabelConfirmationAdapter', () => {
  it('keeps all writes in one transaction and exposes failure instead of creating inventory', async () => {
    const transaction = {
      nutritionLabelDraft: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(),
      },
      foodCategory: { findFirst: jest.fn().mockResolvedValue({ id: 'category' }) },
      nutrientDefinition: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'energy', code: 'ENERGY_KCAL' },
          { id: 'protein', code: 'PROTEIN' },
          { id: 'carb', code: 'CARBOHYDRATE' },
          { id: 'fat', code: 'FAT' },
        ]),
      },
      food: { create: jest.fn().mockRejectedValue(new Error('write failed')) },
      inventoryItem: { create: jest.fn() },
    };
    const prisma = {
      $transaction: jest
        .fn()
        .mockImplementation((callback: (client: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
        ),
    } as unknown as PrismaService;
    const adapter = new PrismaNutritionLabelConfirmationAdapter(prisma);

    await expect(
      adapter.confirm({
        draftId: 'draft',
        householdId: 'house',
        actorId: 'user',
        targetFoodId: null,
        name: 'Food',
        brand: null,
        description: null,
        categoryId: 'category',
        preparationState: 'READY_TO_EAT',
        packageQuantity: '500',
        packageUnit: 'GRAM',
        minimumQuantity: null,
        location: null,
        expiresAt: null,
        now: new Date('2026-08-04T12:00:00Z'),
        nutrients: [
          { code: 'ENERGY_KCAL', normalizedAmount: '200' },
          { code: 'PROTEIN', normalizedAmount: '10' },
          { code: 'CARBOHYDRATE', normalizedAmount: '40' },
          { code: 'FAT', normalizedAmount: '5' },
        ],
        serving: {
          name: 'slice',
          quantity: '1',
          unit: 'slice',
          equivalentGrams: '50',
          equivalentMilliliters: null,
        },
      }),
    ).rejects.toThrow('write failed');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(transaction.inventoryItem.create).not.toHaveBeenCalled();
    expect(transaction.nutritionLabelDraft.update).not.toHaveBeenCalled();
  });

  it('creates a commercial food and returns persisted nutrient metadata and serving id', async () => {
    const foodRecord = persistedFood('COMMERCIAL');
    const transaction = completeTransaction({
      food: {
        create: jest.fn().mockResolvedValue({ id: 'food' }),
        findUnique: jest.fn().mockResolvedValue(foodRecord),
      },
      inventoryItem: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(persistedInventory('inventory', '500')),
      },
    });
    const adapter = adapterFor(transaction);

    const result = await adapter.confirm(input());

    expect(transaction.food.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ foodType: 'COMMERCIAL' }) }),
    );
    expect(result.food.nutrients[0]).toMatchObject({
      id: 'food-nutrient',
      nutrientDefinition: { code: 'PROTEIN', unit: 'g' },
      amount: 10,
    });
    expect(result.food.servings[0]).toMatchObject({ id: 'serving', quantity: 1 });
  });

  it('updates a household custom food and increments its active inventory', async () => {
    const transaction = completeTransaction({
      food: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'target',
            householdId: 'house',
            foodType: 'CUSTOM',
            isGlobal: false,
            isActive: true,
            deletedAt: null,
          })
          .mockResolvedValueOnce(persistedFood('CUSTOM')),
        update: jest.fn(),
      },
      inventoryItem: {
        findFirst: jest.fn().mockResolvedValue(persistedInventory('inventory', '100')),
        update: jest.fn().mockResolvedValue(persistedInventory('inventory', '600')),
      },
      inventoryMovement: { create: jest.fn() },
    });
    const adapter = adapterFor(transaction);

    const result = await adapter.confirm({ ...input(), targetFoodId: 'target' });

    expect(transaction.food.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'target' } }),
    );
    expect(transaction.foodNutrient.deleteMany).toHaveBeenCalledWith({
      where: { foodId: 'target' },
    });
    expect(transaction.foodServing.deleteMany).toHaveBeenCalledWith({
      where: { foodId: 'target' },
    });
    expect(transaction.inventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currentQuantity: { increment: expect.anything() } }),
      }),
    );
    expect(transaction.inventoryMovement.create).toHaveBeenCalled();
    expect(result.food.foodType).toBe('CUSTOM');
    expect(result.inventory.currentQuantity).toBe('600');
  });

  it('rejects a global target without mutating it', async () => {
    const transaction = completeTransaction({
      food: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'global',
          householdId: null,
          foodType: 'COMMERCIAL',
          isGlobal: true,
          isActive: true,
          deletedAt: null,
        }),
        update: jest.fn(),
      },
    });
    const adapter = adapterFor(transaction);

    await expect(adapter.confirm({ ...input(), targetFoodId: 'global' })).rejects.toBeInstanceOf(
      NutritionLabelTargetFoodNotAllowedError,
    );
    expect(transaction.food.update).not.toHaveBeenCalled();
    expect(transaction.inventoryItem.create).not.toHaveBeenCalled();
  });
});

function input(): ConfirmNutritionLabelTransactionInput {
  return {
    draftId: 'draft',
    householdId: 'house',
    actorId: 'user',
    targetFoodId: null,
    name: 'Food',
    brand: null,
    description: null,
    categoryId: 'category',
    preparationState: 'READY_TO_EAT',
    packageQuantity: '500',
    packageUnit: 'GRAM',
    minimumQuantity: null,
    location: null,
    expiresAt: null,
    now: new Date('2026-08-04T12:00:00Z'),
    nutrients: [
      { code: 'ENERGY_KCAL', normalizedAmount: '200' },
      { code: 'PROTEIN', normalizedAmount: '10' },
      { code: 'CARBOHYDRATE', normalizedAmount: '40' },
      { code: 'FAT', normalizedAmount: '5' },
    ],
    serving: {
      name: 'slice',
      quantity: '1',
      unit: 'slice',
      equivalentGrams: '50',
      equivalentMilliliters: null,
    },
  };
}

function adapterFor(transaction: any): PrismaNutritionLabelConfirmationAdapter {
  return new PrismaNutritionLabelConfirmationAdapter({
    $transaction: jest
      .fn()
      .mockImplementation((callback: (value: any) => Promise<unknown>) => callback(transaction)),
  } as unknown as PrismaService);
}

function completeTransaction(overrides: any = {}) {
  return {
    nutritionLabelDraft: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    foodCategory: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'category',
        code: 'BAKERY',
        name: 'Bakery',
        displayOrder: 1,
      }),
    },
    nutrientDefinition: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'energy',
          code: 'ENERGY_KCAL',
          name: 'Energy',
          unit: 'kcal',
          group: 'ENERGY',
          displayOrder: 1,
          isRequired: true,
        },
        {
          id: 'protein',
          code: 'PROTEIN',
          name: 'Protein',
          unit: 'g',
          group: 'MACRO',
          displayOrder: 2,
          isRequired: true,
        },
        {
          id: 'carb',
          code: 'CARBOHYDRATE',
          name: 'Carbohydrate',
          unit: 'g',
          group: 'MACRO',
          displayOrder: 3,
          isRequired: true,
        },
        {
          id: 'fat',
          code: 'FAT',
          name: 'Fat',
          unit: 'g',
          group: 'MACRO',
          displayOrder: 4,
          isRequired: true,
        },
      ]),
    },
    foodNutrient: { createMany: jest.fn(), deleteMany: jest.fn() },
    foodServing: { create: jest.fn(), deleteMany: jest.fn() },
    food: {
      create: jest.fn().mockResolvedValue({ id: 'food' }),
      findUnique: jest.fn().mockResolvedValue(persistedFood('COMMERCIAL')),
    },
    inventoryItem: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(persistedInventory('inventory', '500')),
      update: jest.fn(),
    },
    inventoryMovement: { create: jest.fn() },
    ...overrides,
  };
}

function persistedFood(foodType: 'CUSTOM' | 'COMMERCIAL') {
  return {
    id: foodType === 'CUSTOM' ? 'target' : 'food',
    householdId: 'house',
    name: 'Food',
    brand: null,
    description: null,
    categoryId: 'category',
    category: { id: 'category', code: 'BAKERY', name: 'Bakery', displayOrder: 1 },
    foodType,
    preparationState: 'READY_TO_EAT',
    referenceQuantity: new Prisma.Decimal(100),
    referenceUnit: 'GRAM',
    source: 'NUTRITION_LABEL_OCR',
    sourceReference: 'draft',
    confidenceLevel: 'USER_PROVIDED',
    isGlobal: false,
    nutrients: [
      {
        id: 'food-nutrient',
        nutrientDefinition: {
          id: 'protein',
          code: 'PROTEIN',
          name: 'Protein',
          unit: 'g',
          group: 'MACRO',
          displayOrder: 2,
          isRequired: true,
        },
        amount: new Prisma.Decimal(10),
      },
    ],
    servings: [
      {
        id: 'serving',
        name: 'slice',
        quantity: new Prisma.Decimal(1),
        unit: 'slice',
        equivalentGrams: new Prisma.Decimal(50),
        equivalentMilliliters: null,
      },
    ],
    aliases: [],
  };
}

function persistedInventory(id: string, quantity: string) {
  return {
    id,
    currentQuantity: new Prisma.Decimal(quantity),
    unit: 'GRAM',
    minimumQuantity: null,
    location: null,
    expiresAt: null,
    status: 'ACTIVE',
  };
}
