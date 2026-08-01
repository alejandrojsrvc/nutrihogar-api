import Decimal from 'decimal.js';
import { suggestQuantities } from './quantity-suggestion.service';
import type { NutritionGoalView } from '../../../nutrition/domain/models/nutrition-goal.models';
import type { PlannedMealProps } from '../../domain/models/meal-planning.models';

describe('suggestQuantities', () => {
  it('uses the current goal and fixed half-up rounding without changing the meal', () => {
    const meal = {
      id: 'meal',
      type: 'LUNCH',
      nutritionSnapshot: { calories: 600 },
      participants: [
        {
          id: 'participant',
          adultProfileId: 'adult',
          confirmedQuantity: null,
          confirmedUnit: null,
          suggestedQuantity: null,
          suggestedUnit: null,
          nutritionTargetSnapshot: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    } as unknown as PlannedMealProps;
    const goal = {
      adultProfileId: 'adult',
      validFrom: new Date('2026-01-01'),
      values: { calories: new Decimal(2000) },
    } as NutritionGoalView;
    const result = suggestQuantities(meal, new Map([['adult', goal]]));
    expect(result[0]).toMatchObject({
      quantity: '1.167',
      unit: 'SERVING',
      participantId: 'participant',
    });
    expect(meal.participants[0].suggestedQuantity).toBeNull();
  });
});
