import Decimal from 'decimal.js';
import { Recipe } from '../../../recipes/domain/entities/recipe';
import { WeeklyPlan } from '../../domain/entities/weekly-plan';
import { PlannedMealSource, PlannedMealType } from '../../domain/value-objects/planned-meal';
import { calculateWeeklyRequirements } from './weekly-requirements.service';

describe('calculateWeeklyRequirements', () => {
  it('scales measurable ingredients by confirmed portions, excludes cancelled meals, and warns on serving conversion', () => {
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
      suggestedQuantity: 2,
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
      defaultServings: 4,
      estimatedPreparationMinutes: null,
      ingredients: [
        {
          id: 'gram',
          foodId: 'food-1',
          quantity: new Decimal(800),
          unit: 'GRAM',
          servingId: null,
          position: 1,
          notes: null,
        },
        {
          id: 'serving',
          foodId: 'food-2',
          quantity: new Decimal(1),
          unit: 'SERVING',
          servingId: 'serving-1',
          position: 2,
          notes: null,
        },
      ],
      instructions: [],
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const result = calculateWeeklyRequirements(plan, new Map([['recipe', recipe]]));
    expect(result.items).toEqual([
      { foodId: 'food-1', name: 'food-1', unit: 'GRAM', required: '400' },
    ]);
    expect(result.warnings).toHaveLength(1);
  });
});
