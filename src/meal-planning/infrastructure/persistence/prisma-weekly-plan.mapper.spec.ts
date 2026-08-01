import { PrismaWeeklyPlanMapper } from './prisma-weekly-plan.mapper';

describe('PrismaWeeklyPlanMapper', () => {
  it('converts Decimal and JSON values without returning persistence records', () => {
    const record = {
      id: 'plan-1',
      householdId: 'household-1',
      weekStart: new Date('2026-08-03T00:00:00.000Z'),
      weekEnd: new Date('2026-08-09T00:00:00.000Z'),
      status: 'DRAFT',
      weeklyBudget: { toString: () => '10.250000' },
      currency: 'ARS',
      createdById: 'user-1',
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
      publishedAt: null,
      meals: [
        {
          id: 'meal-1',
          date: new Date('2026-08-03T00:00:00.000Z'),
          type: 'LUNCH',
          source: 'FREE_MEAL',
          recipeId: null,
          nameSnapshot: 'Lunch',
          nutritionSnapshot: { calories: 400 },
          notes: null,
          status: 'PLANNED',
          position: 1,
          replacedMealId: null,
          preparedBatchId: null,
          mealId: null,
          createdAt: new Date('2026-08-01T00:00:00.000Z'),
          updatedAt: new Date('2026-08-01T00:00:00.000Z'),
          participants: [
            {
              id: 'participant-1',
              adultProfileId: 'adult-1',
              suggestedQuantity: { toString: () => '1.25' },
              suggestedUnit: 'portion',
              confirmedQuantity: null,
              confirmedUnit: null,
              nutritionTargetSnapshot: { calories: 200 },
              notes: null,
              createdAt: new Date('2026-08-01T00:00:00.000Z'),
              updatedAt: new Date('2026-08-01T00:00:00.000Z'),
            },
          ],
        },
      ],
    };

    const domain = PrismaWeeklyPlanMapper.toDomain(record);
    const props = domain.toProps();

    expect(props.weeklyBudget?.toString()).toBe('10.25');
    expect(props.meals[0]?.participants[0]?.suggestedQuantity?.toString()).toBe('1.25');
    expect(props.meals[0]?.nutritionSnapshot).toEqual({ calories: 400 });
    expect(domain).not.toHaveProperty('weeklyPlan');
  });
});
