import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { PreparedFoodLeftover } from '../../domain/entities/prepared-food-leftover';
import { PreparedFoodLeftoverAvailabilityExceededError } from '../../domain/errors/prepared-food-leftover.errors';
import { PrismaPreparedFoodLeftoverRepository } from './prisma-prepared-food-leftover.repository';

describe('PrismaPreparedFoodLeftoverRepository', () => {
  it('locks the batch and persists a leftover with density snapshots', async () => {
    const create: jest.MockedFunction<(input: LeftoverCreateInput) => Promise<void>> = jest
      .fn()
      .mockResolvedValue(undefined);
    const transaction = jest.fn((callback: (client: unknown) => unknown) =>
      callback({
        $queryRaw: jest.fn().mockResolvedValue([{ id: 'batch-id' }]),
        preparedBatch: {
          findUnique: jest.fn().mockResolvedValue({
            status: 'FINALIZED',
            finalCookedWeight: new Prisma.Decimal(1650),
          }),
        },
        servedPortion: {
          aggregate: jest
            .fn()
            .mockResolvedValue({ _sum: { servedWeight: new Prisma.Decimal(520) } }),
        },
        preparedFoodLeftover: {
          aggregate: jest.fn().mockResolvedValue({ _sum: { availableWeight: null } }),
          create,
        },
      }),
    );
    const repository = new PrismaPreparedFoodLeftoverRepository({
      $transaction: transaction,
    } as unknown as PrismaService);
    const leftover = createLeftover(750);

    await repository.save(leftover);

    expect(transaction).toHaveBeenCalledTimes(1);
    const input = create.mock.calls[0]?.[0];
    expect(input?.data.preparedBatchId).toBe('batch-id');
    expect(input?.data.availableWeight).toBe('750');
    expect(input?.data.nutrientSnapshots.create[0]?.nutrientCode).toBe('ENERGY_KCAL');
  });

  it('rejects a leftover larger than the locked batch availability', async () => {
    const transaction = jest.fn((callback: (client: unknown) => unknown) =>
      callback({
        $queryRaw: jest.fn().mockResolvedValue([{ id: 'batch-id' }]),
        preparedBatch: {
          findUnique: jest.fn().mockResolvedValue({
            status: 'FINALIZED',
            finalCookedWeight: new Prisma.Decimal(1650),
          }),
        },
        servedPortion: {
          aggregate: jest
            .fn()
            .mockResolvedValue({ _sum: { servedWeight: new Prisma.Decimal(520) } }),
        },
        preparedFoodLeftover: {
          aggregate: jest.fn().mockResolvedValue({ _sum: { availableWeight: null } }),
          create: jest.fn(),
        },
      }),
    );
    const repository = new PrismaPreparedFoodLeftoverRepository({
      $transaction: transaction,
    } as unknown as PrismaService);

    await expect(repository.save(createLeftover(1131))).rejects.toBeInstanceOf(
      PreparedFoodLeftoverAvailabilityExceededError,
    );
  });

  it('reconstructs density snapshots from persistence', async () => {
    const repository = new PrismaPreparedFoodLeftoverRepository({
      preparedFoodLeftover: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'leftover-id',
          preparedBatchId: 'batch-id',
          householdId: 'household-id',
          availableWeight: new Prisma.Decimal(750),
          storedAt: now,
          storageLocation: 'REFRIGERATOR',
          notes: null,
          status: 'AVAILABLE',
          createdAt: now,
          updatedAt: now,
          nutrientSnapshots: [
            {
              id: 'snapshot-id',
              preparedFoodLeftoverId: 'leftover-id',
              nutrientCode: 'ENERGY_KCAL',
              nutrientName: 'Energy',
              unit: 'kcal',
              amountPerGram: new Prisma.Decimal('0.393939'),
            },
          ],
        }),
      },
    } as unknown as PrismaService);

    const result = await repository.findById('leftover-id');

    expect(result?.availableWeight.equals(750)).toBe(true);
    expect(result?.nutrientDensitySnapshot[0]?.amountPerGram.equals('0.393939')).toBe(true);
  });
});

interface LeftoverCreateInput {
  data: {
    preparedBatchId: string;
    availableWeight: string;
    nutrientSnapshots: { create: Array<{ nutrientCode: string }> };
  };
}

const now = new Date('2026-07-31T12:00:00.000Z');

function createLeftover(weight: number) {
  return PreparedFoodLeftover.create({
    id: 'leftover-id',
    preparedBatchId: 'batch-id',
    householdId: 'household-id',
    availableWeight: weight,
    nutrientDensitySnapshot: [
      {
        code: 'ENERGY_KCAL',
        name: 'Energy',
        unit: 'kcal',
        amountPerGram: new Prisma.Decimal(650).div(1650),
      },
    ],
    storedAt: now,
    createdAt: now,
    updatedAt: now,
  });
}
