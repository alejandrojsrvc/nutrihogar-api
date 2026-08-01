import Decimal from 'decimal.js';
import { Recipe } from '../../../recipes/domain/entities/recipe';
import { WeeklyPlan } from '../../domain/entities/weekly-plan';
import { PlannedMealSource, PlannedMealType } from '../../domain/value-objects/planned-meal';
import { ComparePlanWithInventoryQuery } from './weekly-analysis.use-cases';

describe('ComparePlanWithInventoryQuery', () => {
  it('reports partial coverage and ignores expired and prepared-food inventory', async () => {
    const plan = WeeklyPlan.create({
      id: 'plan',
      householdId: 'household',
      weekStart: '2026-08-03',
      createdBy: 'user',
      createdAt: new Date(),
    });
    plan.addMeal({
      id: 'meal',
      date: '2026-08-03',
      type: PlannedMealType.LUNCH,
      source: PlannedMealSource.RECIPE,
      recipeId: 'recipe',
      position: 0,
      occurredAt: new Date(),
    });
    plan.assignParticipant('meal', {
      id: 'participant',
      adultProfileId: 'adult',
      suggestedQuantity: 1,
      suggestedUnit: 'SERVING',
      occurredAt: new Date(),
    });
    const recipe = Recipe.create({
      id: 'recipe',
      householdId: 'household',
      createdById: 'user',
      name: 'Recipe',
      description: null,
      category: null,
      defaultServings: 1,
      estimatedPreparationMinutes: null,
      ingredients: [
        {
          id: 'ingredient',
          foodId: 'food',
          quantity: new Decimal(10),
          unit: 'GRAM',
          servingId: null,
          position: 1,
          notes: null,
        },
      ],
      instructions: [],
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const query = new ComparePlanWithInventoryQuery({
      households: {
        findAccess: () =>
          Promise.resolve({
            status: 'ACTIVE',
            household: { id: 'household' },
            role: 'MEMBER',
          }),
      } as never,
      plans: { findById: () => Promise.resolve(plan) } as never,
      recipes: { findByIdForHousehold: () => Promise.resolve(recipe) } as never,
      inventory: {
        listByHousehold: () =>
          Promise.resolve({
            items: [
              {
                toProps: () => ({
                  foodId: 'food',
                  itemType: 'FOOD',
                  status: 'ACTIVE',
                  unit: 'GRAM',
                  currentQuantity: new Decimal(4),
                  expiresAt: null,
                }),
              },
              {
                toProps: () => ({
                  foodId: 'food',
                  itemType: 'PREPARED_FOOD',
                  status: 'ACTIVE',
                  unit: 'GRAM',
                  currentQuantity: new Decimal(100),
                  expiresAt: null,
                }),
              },
              {
                toProps: () => ({
                  foodId: 'food',
                  itemType: 'FOOD',
                  status: 'ACTIVE',
                  unit: 'GRAM',
                  currentQuantity: new Decimal(100),
                  expiresAt: new Date('2020-01-01'),
                }),
              },
            ],
            page: 1,
            limit: 10000,
            total: 3,
          }),
      } as never,
    });
    const result = await query.execute('user', 'plan');
    expect(result.items[0]).toMatchObject({
      required: '10',
      available: '4',
      missing: '6',
      coverage: '0.4',
      status: 'PARTIAL',
    });
  });
});
