import { randomUUID } from 'node:crypto';
import {
  ConfidenceLevel,
  FoodType,
  HouseholdInvitationRole,
  HouseholdInvitationStatus,
  HouseholdMembershipRole,
  HouseholdMembershipStatus,
  PreparationState,
  Prisma,
  PrismaClient,
  ReferenceUnit,
} from '@prisma/client';
import {
  FOOD_CATEGORIES,
  NUTRIENT_DEFINITIONS,
  NUTRITION_CATALOG_FOODS,
} from '../../src/food-catalog/infrastructure/seed/nutrition-catalog.data';
import { seedNutritionCatalog } from '../../src/food-catalog/infrastructure/seed/nutrition-catalog.seeder';

const testDatabaseUrl = process.env.DATABASE_URL_TEST;

function pointsToLocalPostgres(databaseUrl: string | undefined): boolean {
  if (!databaseUrl) {
    return false;
  }

  try {
    const parsedUrl = new URL(databaseUrl);
    return ['127.0.0.1', 'localhost'].includes(parsedUrl.hostname) && parsedUrl.port === '5432';
  } catch {
    return false;
  }
}

const isLocalTestDatabase = pointsToLocalPostgres(testDatabaseUrl);

if (testDatabaseUrl && !isLocalTestDatabase) {
  throw new Error('DATABASE_URL_TEST debe apuntar al PostgreSQL local en 127.0.0.1:5432.');
}

const databaseTests = isLocalTestDatabase ? describe : describe.skip;
const prisma = isLocalTestDatabase
  ? new PrismaClient({ datasourceUrl: testDatabaseUrl! })
  : undefined;

class RollbackTestTransaction extends Error {}

async function runInRollback(
  callback: (transaction: Prisma.TransactionClient) => Promise<void>,
): Promise<void> {
  if (!prisma) {
    throw new Error('DATABASE_URL_TEST no apunta al PostgreSQL local.');
  }

  try {
    await prisma.$transaction(async (transaction) => {
      await callback(transaction);
      throw new RollbackTestTransaction();
    });
  } catch (error) {
    if (!(error instanceof RollbackTestTransaction)) {
      throw error;
    }
  }
}

databaseTests('Identity and household persistence', () => {
  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('creates users, households, memberships and invitations with their relations', async () => {
    await runInRollback(async (transaction) => {
      const creator = await transaction.user.create({
        data: {
          email: `creator-${randomUUID()}@nutrihogar.local`,
        },
      });
      const member = await transaction.user.create({
        data: {
          email: `member-${randomUUID()}@nutrihogar.local`,
        },
      });
      const household = await transaction.household.create({
        data: {
          name: 'Familia local',
          createdById: creator.id,
          weeklyBudget: new Prisma.Decimal('125.50'),
        },
      });
      const secondHousehold = await transaction.household.create({
        data: {
          name: 'Segundo hogar local',
          createdById: creator.id,
        },
      });
      const creatorMembership = await transaction.householdMembership.create({
        data: {
          householdId: household.id,
          userId: creator.id,
          role: HouseholdMembershipRole.ADMIN,
          status: HouseholdMembershipStatus.ACTIVE,
        },
      });
      const memberMembership = await transaction.householdMembership.create({
        data: {
          householdId: household.id,
          userId: member.id,
          role: HouseholdMembershipRole.ADMIN,
          status: HouseholdMembershipStatus.ACTIVE,
        },
      });
      await transaction.householdMembership.create({
        data: {
          householdId: secondHousehold.id,
          userId: creator.id,
          role: HouseholdMembershipRole.MEMBER,
          status: HouseholdMembershipStatus.ACTIVE,
        },
      });
      const invitation = await transaction.householdInvitation.create({
        data: {
          householdId: household.id,
          email: member.email,
          tokenHash: `hash-${randomUUID()}`,
          role: HouseholdInvitationRole.MEMBER,
          status: HouseholdInvitationStatus.PENDING,
          expiresAt: new Date('2026-08-30T00:00:00.000Z'),
          invitedById: creator.id,
        },
      });

      expect(creatorMembership.role).toBe(HouseholdMembershipRole.ADMIN);
      expect(memberMembership.role).toBe(HouseholdMembershipRole.ADMIN);
      expect(household.weeklyBudget?.toString()).toBe('125.5');
      expect(invitation.tokenHash).toContain('hash-');
      expect(secondHousehold.createdById).toBe(creator.id);
    });
  });

  it('prevents duplicate memberships for the same user and household', async () => {
    await runInRollback(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          email: `duplicate-${randomUUID()}@nutrihogar.local`,
        },
      });
      const household = await transaction.household.create({
        data: {
          name: 'Hogar duplicado local',
          createdById: user.id,
        },
      });

      await transaction.householdMembership.create({
        data: {
          householdId: household.id,
          userId: user.id,
          role: HouseholdMembershipRole.ADMIN,
          status: HouseholdMembershipStatus.ACTIVE,
        },
      });

      await expect(
        transaction.householdMembership.create({
          data: {
            householdId: household.id,
            userId: user.id,
            role: HouseholdMembershipRole.MEMBER,
            status: HouseholdMembershipStatus.INACTIVE,
          },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });
    });
  });

  it('restricts deleting a user that created a household', async () => {
    await runInRollback(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          email: `restricted-${randomUUID()}@nutrihogar.local`,
        },
      });
      await transaction.household.create({
        data: {
          name: 'Hogar restringido local',
          createdById: user.id,
        },
      });

      await expect(transaction.user.delete({ where: { id: user.id } })).rejects.toMatchObject({
        code: 'P2003',
      });
    });
  });

  it('creates a global food with nutrients, servings and aliases', async () => {
    await runInRollback(async (transaction) => {
      const category = await transaction.foodCategory.create({
        data: {
          code: `CATEGORY-${randomUUID()}`,
          name: 'Categoría de prueba',
          displayOrder: 1,
        },
      });
      const energy = await transaction.nutrientDefinition.create({
        data: {
          code: `ENERGY-${randomUUID()}`,
          name: 'Energía',
          unit: 'kcal',
          group: 'ENERGY',
          displayOrder: 1,
          isRequired: true,
        },
      });
      const food = await transaction.food.create({
        data: {
          name: 'Alimento global',
          categoryId: category.id,
          foodType: FoodType.GENERIC,
          preparationState: PreparationState.RAW,
          referenceQuantity: new Prisma.Decimal(100),
          referenceUnit: ReferenceUnit.GRAM,
          source: 'TEST',
          sourceReference: randomUUID(),
          confidenceLevel: ConfidenceLevel.VERIFIED,
          isGlobal: true,
          nutrients: {
            create: {
              nutrientDefinitionId: energy.id,
              amount: new Prisma.Decimal('120.5'),
            },
          },
          servings: {
            create: {
              name: 'Porción',
              quantity: new Prisma.Decimal(1),
              unit: 'UNIT',
              equivalentGrams: new Prisma.Decimal(50),
            },
          },
          aliases: {
            create: { alias: 'Alias global' },
          },
        },
        include: {
          nutrients: true,
          servings: true,
          aliases: true,
        },
      });

      expect(food.householdId).toBeNull();
      expect(food.nutrients).toHaveLength(1);
      expect(food.servings[0]?.equivalentGrams?.toString()).toBe('50');
      expect(food.aliases[0]?.alias).toBe('Alias global');

      await expect(
        transaction.foodNutrient.create({
          data: {
            foodId: food.id,
            nutrientDefinitionId: energy.id,
            amount: new Prisma.Decimal(121),
          },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });
    });
  });

  it('creates a custom food owned by a household', async () => {
    await runInRollback(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          email: `food-owner-${randomUUID()}@nutrihogar.local`,
        },
      });
      const household = await transaction.household.create({
        data: {
          name: 'Hogar con alimento personalizado',
          createdById: user.id,
        },
      });
      const category = await transaction.foodCategory.create({
        data: {
          code: `CUSTOM-${randomUUID()}`,
          name: 'Categoría personalizada',
          displayOrder: 1,
        },
      });
      const food = await transaction.food.create({
        data: {
          householdId: household.id,
          name: 'Alimento personalizado',
          categoryId: category.id,
          foodType: FoodType.CUSTOM,
          preparationState: PreparationState.NOT_APPLICABLE,
          referenceQuantity: new Prisma.Decimal(100),
          referenceUnit: ReferenceUnit.GRAM,
          source: 'USER',
          confidenceLevel: ConfidenceLevel.USER_PROVIDED,
          isGlobal: false,
          createdById: user.id,
        },
      });

      expect(food.householdId).toBe(household.id);
      expect(food.createdById).toBe(user.id);
      expect(food.foodType).toBe(FoodType.CUSTOM);
    });
  });

  it('seeds the nutrition catalog twice without duplicating records', async () => {
    await runInRollback(async (transaction) => {
      const sources = [...new Set(NUTRITION_CATALOG_FOODS.map(({ source }) => source))];
      const categoryCodes = FOOD_CATEGORIES.map(({ code }) => code);
      const nutrientCodes = NUTRIENT_DEFINITIONS.map(({ code }) => code);

      await transaction.food.deleteMany({ where: { source: { in: sources } } });
      await transaction.foodCategory.deleteMany({ where: { code: { in: categoryCodes } } });
      await transaction.nutrientDefinition.deleteMany({
        where: { code: { in: nutrientCodes } },
      });

      await seedNutritionCatalog(transaction);
      await seedNutritionCatalog(transaction);

      const [categoryCount, nutrientCount, foods] = await Promise.all([
        transaction.foodCategory.count({ where: { code: { in: categoryCodes } } }),
        transaction.nutrientDefinition.count({ where: { code: { in: nutrientCodes } } }),
        transaction.food.findMany({
          where: { source: { in: sources } },
          include: {
            nutrients: {
              include: { nutrientDefinition: true },
            },
            servings: true,
          },
        }),
      ]);

      expect(categoryCount).toBe(12);
      expect(nutrientCount).toBe(14);
      expect(foods).toHaveLength(25);
      expect(
        foods.every(
          ({ nutrients }) =>
            nutrients.filter(({ nutrientDefinition }) => nutrientDefinition.isRequired).length ===
            4,
        ),
      ).toBe(true);
      expect(
        foods.flatMap(({ servings }) => servings).filter(({ equivalentGrams }) => equivalentGrams)
          .length,
      ).toBe(4);
    });
  });
});
