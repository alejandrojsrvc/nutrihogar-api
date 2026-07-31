import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { PrismaNutritionFoodRepository } from './prisma-nutrition-food.repository';

describe('PrismaNutritionFoodRepository', () => {
  it('returns only an active food visible to an active household member', async () => {
    const membership: jest.MockedFunction<(input: unknown) => Promise<{ id: string }>> = jest
      .fn()
      .mockResolvedValue({ id: 'membership-id' });
    const food: jest.MockedFunction<(input: unknown) => Promise<unknown>> = jest
      .fn()
      .mockResolvedValue({
        id: 'food-id',
        name: 'Arroz cocido',
        brand: null,
        preparationState: 'COOKED',
        confidenceLevel: 'VERIFIED',
        referenceQuantity: new Prisma.Decimal(100),
        referenceUnit: 'GRAM',
        nutrients: [
          {
            amount: new Prisma.Decimal('2.7'),
            nutrientDefinition: { code: 'PROTEIN', name: 'Proteína', unit: 'g' },
          },
        ],
        servings: [],
      });
    const repository = new PrismaNutritionFoodRepository({
      householdMembership: { findFirst: membership },
      food: { findFirst: food },
    } as unknown as PrismaService);

    const result = await repository.findVisibleById({
      actorId: 'user-id',
      householdId: 'household-id',
      foodId: 'food-id',
    });

    expect(membership.mock.calls[0]?.[0]).toEqual({
      where: {
        userId: 'user-id',
        householdId: 'household-id',
        status: 'ACTIVE',
        household: { deletedAt: null },
      },
      select: { id: true },
    });
    expect(food.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        where: {
          id: 'food-id',
          isActive: true,
          deletedAt: null,
          OR: [
            { isGlobal: true, householdId: null },
            { isGlobal: false, householdId: 'household-id' },
          ],
        },
      }),
    );
    expect(result).toEqual({
      id: 'food-id',
      name: 'Arroz cocido',
      brand: null,
      preparationState: 'COOKED',
      confidenceLevel: 'VERIFIED',
      referenceQuantity: '100',
      referenceUnit: 'GRAM',
      nutrients: [{ code: 'PROTEIN', name: 'Proteína', unit: 'g', amount: '2.7' }],
      servings: [],
    });
  });
});
