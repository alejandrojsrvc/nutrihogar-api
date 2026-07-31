import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { ServedPortion } from '../../domain/entities/served-portion';
import { PrismaServedPortionRepository } from './prisma-served-portion.repository';

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
});

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
