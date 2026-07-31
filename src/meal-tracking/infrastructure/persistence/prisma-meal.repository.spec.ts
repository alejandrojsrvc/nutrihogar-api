import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';
import { PrismaService } from '../../../database/prisma.service';
import { CreateMealInput } from '../../application/ports/meal-repository.port';
import { PrismaMealRepository } from './prisma-meal.repository';

describe('PrismaMealRepository', () => {
  it('checks active household membership before allowing meal access', async () => {
    const findFirst = jest.fn().mockResolvedValue({ role: 'MEMBER' });
    const repository = new PrismaMealRepository({
      householdMembership: { findFirst },
    } as unknown as PrismaService);

    await expect(repository.findHouseholdAccess('user-id', 'household-id')).resolves.toEqual({
      role: 'MEMBER',
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-id',
        householdId: 'household-id',
        status: 'ACTIVE',
        household: { deletedAt: null },
      },
      select: { role: true },
    });
  });

  it('creates a meal and all snapshots in the same transaction', async () => {
    const create: jest.MockedFunction<(input: unknown) => Promise<typeof mealRecord>> = jest
      .fn()
      .mockResolvedValue(mealRecord);
    const transaction = jest.fn((callback: (client: unknown) => unknown) =>
      callback({ meal: { create } }),
    );
    const repository = new PrismaMealRepository({
      $transaction: transaction,
    } as unknown as PrismaService);

    await repository.create(input);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      data: {
        householdId: 'household-id',
        items: {
          create: [
            {
              nameSnapshot: 'Arroz cocido',
              quantity: '180',
              nutrientSnapshots: {
                create: [
                  {
                    nutrientCode: 'PROTEIN',
                    nutrientName: 'Proteína',
                    unit: 'g',
                    amount: '4.86',
                  },
                ],
              },
            },
          ],
        },
      },
    });
  });

  it('propagates transaction failures so the caller can observe rollback', async () => {
    const failure = new Error('snapshot failure');
    const transaction = jest.fn().mockRejectedValue(failure);
    const repository = new PrismaMealRepository({
      $transaction: transaction,
    } as unknown as PrismaService);

    await expect(repository.create(input)).rejects.toBe(failure);
  });
});

const input: CreateMealInput = {
  householdId: 'household-id',
  adultProfileId: 'profile-id',
  mealType: 'LUNCH',
  consumedAt: new Date('2026-07-30T12:00:00.000Z'),
  notes: null,
  createdById: 'user-id',
  source: 'MANUAL',
  items: [
    {
      foodId: 'food-id',
      nameSnapshot: 'Arroz cocido',
      brandSnapshot: null,
      preparationStateSnapshot: 'COOKED',
      quantity: new Decimal(180),
      unit: 'GRAM',
      baseQuantity: new Decimal(180),
      baseUnit: 'GRAM',
      measurementMethod: 'WEIGHED',
      confidenceLevel: 'VERIFIED',
      nutrients: [{ code: 'PROTEIN', name: 'Proteína', unit: 'g', amount: new Decimal('4.86') }],
    },
  ],
};

const mealRecord = {
  id: 'meal-id',
  householdId: 'household-id',
  adultProfileId: 'profile-id',
  mealType: 'LUNCH',
  consumedAt: input.consumedAt,
  status: 'CONFIRMED',
  source: 'MANUAL',
  notes: null,
  createdById: 'user-id',
  createdAt: input.consumedAt,
  updatedAt: input.consumedAt,
  deletedAt: null,
  items: [
    {
      id: 'meal-item-id',
      mealId: 'meal-id',
      foodId: 'food-id',
      foodServingId: null,
      nameSnapshot: 'Arroz cocido',
      brandSnapshot: null,
      preparationStateSnapshot: 'COOKED',
      quantity: new Prisma.Decimal(180),
      unit: 'GRAM',
      baseQuantity: new Prisma.Decimal(180),
      baseUnit: 'GRAM',
      measurementMethod: 'WEIGHED',
      confidenceLevel: 'VERIFIED',
      createdAt: input.consumedAt,
      updatedAt: input.consumedAt,
      nutrientSnapshots: [
        {
          id: 'snapshot-id',
          mealItemId: 'meal-item-id',
          nutrientCode: 'PROTEIN',
          nutrientName: 'Proteína',
          unit: 'g',
          amount: new Prisma.Decimal('4.86'),
        },
      ],
    },
  ],
};
