import { Household as PrismaHousehold } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { PrismaHouseholdUnitOfWork } from './prisma-household-unit-of-work';

describe('PrismaHouseholdUnitOfWork', () => {
  it('creates the household and admin membership in one transaction', async () => {
    const household: PrismaHousehold = {
      id: 'household-id',
      name: 'Hogar Sojo',
      timezone: 'America/Argentina/Buenos_Aires',
      currency: 'ARS',
      weeklyBudget: null,
      createdById: 'user-id',
      createdAt: new Date('2026-07-30T10:00:00.000Z'),
      updatedAt: new Date('2026-07-30T10:00:00.000Z'),
      deletedAt: null,
    };
    const transactionClient = {
      household: {
        create: jest.fn().mockResolvedValue(household),
      },
      householdMembership: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const transaction = jest.fn(
      async (
        callback: (
          client: typeof transactionClient,
        ) => Promise<PrismaHousehold>,
      ) => callback(transactionClient),
    );
    const prisma = { $transaction: transaction } as unknown as PrismaService;
    const unitOfWork = new PrismaHouseholdUnitOfWork(prisma);

    await expect(
      unitOfWork.createWithAdminMembership({
        createdById: 'user-id',
        name: 'Hogar Sojo',
        timezone: 'America/Argentina/Buenos_Aires',
        currency: 'ARS',
      }),
    ).resolves.toMatchObject({
      id: household.id,
      name: household.name,
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(transactionClient.household.create).toHaveBeenCalledWith({
      data: {
        name: 'Hogar Sojo',
        timezone: 'America/Argentina/Buenos_Aires',
        currency: 'ARS',
        createdById: 'user-id',
      },
    });
    expect(transactionClient.householdMembership.create).toHaveBeenCalledWith({
      data: {
        householdId: household.id,
        userId: 'user-id',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
  });
});
