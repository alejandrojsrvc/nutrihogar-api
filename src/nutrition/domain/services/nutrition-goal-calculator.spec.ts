import { NutritionGoalCalculator } from './nutrition-goal-calculator';

describe('NutritionGoalCalculator', () => {
  const calculator = new NutritionGoalCalculator();

  it('calculates a male fat-loss proposal with Mifflin-St Jeor', () => {
    const result = calculator.calculate({
      age: 36,
      biologicalSex: 'MALE',
      weightKg: 85,
      heightCm: 180,
      activityLevel: 'MODERATE',
      primaryGoal: 'FAT_LOSS',
    });

    expect(result.bmr.toNumber()).toBe(1800);
    expect(result.activityFactor.toNumber()).toBe(1.55);
    expect(result.tdee.toNumber()).toBe(2790);
    expect(result.dailyCalories.toNumber()).toBe(2232);
    expect(result.proteinGrams.toNumber()).toBe(170);
    expect(result.fatGrams.toNumber()).toBe(62);
    expect(result.carbohydrateGrams.toNumber()).toBe(249);
    expect(result.fiberGrams.toNumber()).toBe(31);
  });

  it('uses the female Mifflin-St Jeor adjustment', () => {
    const result = calculator.calculate({
      age: 36,
      biologicalSex: 'FEMALE',
      weightKg: 70,
      heightCm: 165,
      activityLevel: 'SEDENTARY',
      primaryGoal: 'MAINTENANCE',
    });

    expect(result.bmr.toNumber()).toBe(1390);
    expect(result.tdee.toNumber()).toBe(1668);
    expect(result.dailyCalories.toNumber()).toBe(1668);
  });

  it.each([
    ['SEDENTARY', 1.2],
    ['LIGHT', 1.375],
    ['MODERATE', 1.55],
    ['HIGH', 1.725],
    ['VERY_HIGH', 1.9],
  ] as const)('uses the %s activity factor', (activityLevel, expectedFactor) => {
    const result = calculator.calculate({
      age: 30,
      biologicalSex: 'MALE',
      weightKg: 80,
      heightCm: 180,
      activityLevel,
      primaryGoal: 'MAINTENANCE',
    });

    expect(result.activityFactor.toNumber()).toBe(expectedFactor);
  });
});
