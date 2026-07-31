import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { ServedPortion } from '../../domain/entities/served-portion';
import { PortionAvailabilityExceededError } from '../../domain/errors/served-portion.errors';
import { PreparedBatchMealInput } from '../../application/ports/served-portion-repository.port';
import { PrismaServedPortionRepository } from './prisma-served-portion.repository';

const now = new Date('2026-07-31T12:00:00.000Z');

describe('PrismaServedPortionRepository', () => {
  it('creates portions in one transaction and locks the prepared batch for availability', async () => {
    const createMany: jest.MockedFunction<(input: unknown) => Promise<void>> = jest
      .fn()
      .mockResolvedValue(undefined);
    const transaction = jest.fn((callback: (client: unknown) => unknown) =>
      callback({
        $queryRaw: jest.fn().mockResolvedValue([{ id: 'batch-id' }]),
        preparedBatch: {
          findUnique: jest.fn().mockResolvedValue({
            status: 'FINALIZED',
            finalCookedWeight: new Prisma.Decimal(1000),
          }),
        },
        servedPortion: {
          aggregate: jest.fn().mockResolvedValue({ _sum: { servedWeight: new Prisma.Decimal(0) } }),
          createMany,
        },
        preparedFoodLeftover: {
          aggregate: jest.fn().mockResolvedValue({ _sum: { availableWeight: null } }),
        },
      }),
    );
    const repository = new PrismaServedPortionRepository({
      $transaction: transaction,
    } as unknown as PrismaService);

    await repository.saveMany('batch-id', [createPortion(300)]);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(createMany.mock.calls[0]?.[0]).toMatchObject({
      data: [{ preparedBatchId: 'batch-id', servedWeight: '300' }],
    });
  });

  it('reconstructs remainder and nutrient snapshots', async () => {
    const findUnique = jest.fn().mockResolvedValue(record);
    const repository = new PrismaServedPortionRepository({
      servedPortion: { findUnique },
    } as unknown as PrismaService);

    const result = await repository.findById('portion-id');

    expect(result?.remainder?.weight.equals(40)).toBe(true);
    expect(result?.nutritionSnapshot[0]?.amount.equals(700)).toBe(true);
  });

  it('prevents serving weight already reserved as a stored leftover', async () => {
    const transaction = jest.fn((callback: (client: unknown) => unknown) =>
      callback({
        $queryRaw: jest.fn().mockResolvedValue([{ id: 'batch-id' }]),
        preparedBatch: {
          findUnique: jest.fn().mockResolvedValue({
            status: 'FINALIZED',
            finalCookedWeight: new Prisma.Decimal(1000),
          }),
        },
        servedPortion: {
          aggregate: jest.fn().mockResolvedValue({ _sum: { servedWeight: new Prisma.Decimal(0) } }),
          createMany: jest.fn(),
        },
        preparedFoodLeftover: {
          aggregate: jest.fn().mockResolvedValue({
            _sum: { availableWeight: new Prisma.Decimal(700) },
          }),
        },
      }),
    );
    const repository = new PrismaServedPortionRepository({
      $transaction: transaction,
    } as unknown as PrismaService);

    await expect(repository.saveMany('batch-id', [createPortion(301)])).rejects.toBeInstanceOf(
      PortionAvailabilityExceededError,
    );
  });

  it('calculates availability by subtracting served portions and stored leftovers', async () => {
    const repository = new PrismaServedPortionRepository({
      preparedBatch: {
        findUnique: jest.fn().mockResolvedValue({
          status: 'FINALIZED',
          finalCookedWeight: new Prisma.Decimal(1650),
        }),
      },
      servedPortion: { findMany: jest.fn().mockResolvedValue([record]) },
      preparedFoodLeftover: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { availableWeight: new Prisma.Decimal(500) },
        }),
      },
    } as unknown as PrismaService);

    const result = await repository.getAvailability('batch-id');

    expect(result?.servedWeight.equals(520)).toBe(true);
    expect(result?.storedLeftoverWeight.equals(500)).toBe(true);
    expect(result?.savedRemainderWeight.equals(40)).toBe(true);
    expect(result?.availableWeight.equals(630)).toBe(true);
  });

  it('lists all portions for a batch in served-date order', async () => {
    const findMany = jest.fn().mockResolvedValue([record]);
    const repository = new PrismaServedPortionRepository({
      servedPortion: { findMany },
    } as unknown as PrismaService);

    const result = await repository.findByPreparedBatchId('batch-id');

    expect(result).toHaveLength(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { preparedBatchId: 'batch-id' } }),
    );
  });

  it('persists the generated meal and consumed portion in one transaction', async () => {
    const mealCreate: jest.MockedFunction<(input: MealCreateInput) => Promise<void>> = jest
      .fn()
      .mockResolvedValue(undefined);
    const servedPortionFindUnique = jest
      .fn()
      .mockResolvedValueOnce({ status: 'SERVED' })
      .mockResolvedValueOnce({ id: 'portion-id' });
    const servedPortionUpdate = jest.fn().mockResolvedValue(undefined);
    const transaction = jest.fn((callback: (client: unknown) => unknown) =>
      callback({
        $queryRaw: jest.fn().mockResolvedValue([{ id: 'portion-id' }]),
        servedPortion: {
          findUnique: servedPortionFindUnique,
          update: servedPortionUpdate,
        },
        portionRemainder: { deleteMany: jest.fn() },
        meal: { create: mealCreate },
      }),
    );
    const repository = new PrismaServedPortionRepository({
      $transaction: transaction,
    } as unknown as PrismaService);
    const portion = createPortion(520);
    portion.confirmConsumption(
      [{ code: 'ENERGY_KCAL', name: 'Energy', unit: 'kcal', amount: new Prisma.Decimal(200) }],
      now,
      'meal-id',
    );

    await repository.confirmConsumption(portion, createMealInput());

    expect(transaction).toHaveBeenCalledTimes(1);
    const input = mealCreate.mock.calls[0]?.[0];
    expect(input?.data.id).toBe('meal-id');
    expect(input?.data.source).toBe('PREPARED_BATCH');
    expect(input?.data.items.create.quantity).toBe('480');
    expect(input?.data.items.create.unit).toBe('GRAM');
    expect(servedPortionUpdate).toHaveBeenCalledTimes(1);
  });
});

interface MealCreateInput {
  data: {
    id: string;
    source: string;
    items: { create: { quantity: string; unit: string } };
  };
}

function createPortion(weight: number) {
  return ServedPortion.create({
    id: 'portion-id',
    preparedBatchId: 'batch-id',
    adultProfileId: 'profile-id',
    servedWeight: weight,
    servedAt: new Date('2026-07-31T12:00:00.000Z'),
    createdById: 'user-id',
    createdAt: new Date('2026-07-31T12:00:00.000Z'),
    updatedAt: new Date('2026-07-31T12:00:00.000Z'),
  });
}

function createMealInput(): PreparedBatchMealInput {
  return {
    id: 'meal-id',
    householdId: 'household-id',
    adultProfileId: 'profile-id',
    mealType: 'LUNCH',
    consumedAt: now,
    createdById: 'user-id',
    item: {
      nameSnapshot: 'Arroz con pollo',
      quantity: new Prisma.Decimal(480),
      nutrients: [
        { code: 'ENERGY_KCAL', name: 'Energy', unit: 'kcal', amount: new Prisma.Decimal(200) },
      ],
    },
  };
}

const record = {
  id: 'portion-id',
  preparedBatchId: 'batch-id',
  adultProfileId: 'profile-id',
  servedWeight: new Prisma.Decimal(520),
  servedAt: new Date('2026-07-31T12:00:00.000Z'),
  status: 'SERVED' as const,
  remainderWeight: new Prisma.Decimal(40),
  consumedWeight: new Prisma.Decimal(480),
  mealId: null,
  createdById: 'user-id',
  createdAt: new Date('2026-07-31T12:00:00.000Z'),
  updatedAt: new Date('2026-07-31T12:00:00.000Z'),
  cancelledAt: null,
  remainder: {
    id: 'remainder-id',
    servedPortionId: 'portion-id',
    weight: new Prisma.Decimal(40),
    disposition: 'SAVED' as const,
    createdAt: new Date('2026-07-31T12:30:00.000Z'),
  },
  nutrientSnapshots: [
    {
      id: 'snapshot-id',
      servedPortionId: 'portion-id',
      nutrientCode: 'ENERGY_KCAL',
      nutrientName: 'Energy',
      unit: 'kcal',
      amount: new Prisma.Decimal(700),
    },
  ],
};
