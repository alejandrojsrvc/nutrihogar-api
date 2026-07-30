import {
  ActivityLevel,
  AdultProfile,
  BiologicalSex,
  DietaryRestriction,
  DietaryRestrictionType,
  PrimaryGoal,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { PrismaAdultProfileUnitOfWork } from './prisma-adult-profile.unit-of-work';

const profile: AdultProfile = {
  id: 'profile-id',
  householdId: 'household-id',
  userId: 'user-id',
  name: 'Alejandro',
  birthDate: new Date('1990-05-20T00:00:00.000Z'),
  biologicalSex: BiologicalSex.MALE,
  weightKg: new Prisma.Decimal('80.5'),
  heightCm: new Prisma.Decimal('175.5'),
  activityLevel: ActivityLevel.MODERATE,
  primaryGoal: PrimaryGoal.MAINTENANCE,
  hasKitchenScale: true,
  isActive: true,
  createdAt: new Date('2026-07-30T10:00:00.000Z'),
  updatedAt: new Date('2026-07-30T10:00:00.000Z'),
  deletedAt: null,
};

const restriction: DietaryRestriction = {
  id: 'restriction-id',
  adultProfileId: profile.id,
  type: DietaryRestrictionType.ALLERGY,
  name: 'Maní',
  severity: 'Severa',
  notes: null,
  createdAt: profile.createdAt,
  updatedAt: profile.updatedAt,
};

describe('PrismaAdultProfileUnitOfWork', () => {
  it('creates the profile and its restrictions in one transaction', async () => {
    const create = jest.fn().mockResolvedValue({
      ...profile,
      dietaryRestrictions: [restriction],
    });
    const transactionClient = {
      adultProfile: { create },
    };
    const transaction = jest.fn(
      async (
        callback: (
          client: typeof transactionClient,
        ) => Promise<AdultProfile & { dietaryRestrictions: DietaryRestriction[] }>,
      ) => callback(transactionClient),
    );
    const prisma = { $transaction: transaction } as unknown as PrismaService;
    const unitOfWork = new PrismaAdultProfileUnitOfWork(prisma);

    await expect(
      unitOfWork.create({
        householdId: profile.householdId,
        userId: profile.userId,
        name: profile.name,
        birthDate: profile.birthDate,
        biologicalSex: 'MALE',
        weightKg: 80.5,
        heightCm: 175.5,
        activityLevel: 'MODERATE',
        primaryGoal: 'MAINTENANCE',
        hasKitchenScale: true,
        dietaryRestrictions: [
          {
            type: 'ALLERGY',
            name: 'Maní',
            severity: 'Severa',
            notes: null,
          },
        ],
      }),
    ).resolves.toMatchObject({
      id: profile.id,
      weightKg: 80.5,
      heightCm: 175.5,
      dietaryRestrictions: [{ name: 'Maní' }],
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: {
        householdId: profile.householdId,
        userId: profile.userId,
        name: profile.name,
        birthDate: profile.birthDate,
        biologicalSex: 'MALE',
        weightKg: 80.5,
        heightCm: 175.5,
        activityLevel: 'MODERATE',
        primaryGoal: 'MAINTENANCE',
        hasKitchenScale: true,
        dietaryRestrictions: {
          create: [
            {
              type: 'ALLERGY',
              name: 'Maní',
              severity: 'Severa',
              notes: null,
            },
          ],
        },
      },
      include: {
        dietaryRestrictions: { orderBy: { createdAt: 'asc' } },
      },
    });
  });

  it('replaces restrictions when they are included in an update', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const transactionClient = {
      adultProfile: {
        updateMany,
        findUnique: jest.fn().mockResolvedValue({
          ...profile,
          dietaryRestrictions: [restriction],
        }),
      },
      dietaryRestriction: { deleteMany, createMany },
    };
    const transaction = jest.fn(
      async (
        callback: (
          client: typeof transactionClient,
        ) => Promise<(AdultProfile & { dietaryRestrictions: DietaryRestriction[] }) | null>,
      ) => callback(transactionClient),
    );
    const prisma = { $transaction: transaction } as unknown as PrismaService;
    const unitOfWork = new PrismaAdultProfileUnitOfWork(prisma);

    await unitOfWork.update(profile.id, {
      dietaryRestrictions: [
        {
          type: 'ALLERGY',
          name: 'Maní',
          severity: 'Severa',
          notes: null,
        },
      ],
    });

    expect(deleteMany).toHaveBeenCalledWith({
      where: { adultProfileId: profile.id },
    });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          adultProfileId: profile.id,
          type: 'ALLERGY',
          name: 'Maní',
          severity: 'Severa',
          notes: null,
        },
      ],
    });
  });
});
