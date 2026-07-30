import Decimal from 'decimal.js';

export type NutritionBiologicalSex = 'MALE' | 'FEMALE';
export type NutritionActivityLevel = 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
export type NutritionPrimaryGoal = 'FAT_LOSS' | 'MAINTENANCE' | 'MUSCLE_GAIN';

const activityFactors: Record<NutritionActivityLevel, Decimal> = {
  SEDENTARY: new Decimal('1.2'),
  LIGHT: new Decimal('1.375'),
  MODERATE: new Decimal('1.55'),
  HIGH: new Decimal('1.725'),
  VERY_HIGH: new Decimal('1.9'),
};

const calorieAdjustments: Record<NutritionPrimaryGoal, Decimal> = {
  FAT_LOSS: new Decimal('-0.2'),
  MAINTENANCE: new Decimal(0),
  MUSCLE_GAIN: new Decimal('0.1'),
};

const proteinGramsPerKg: Record<NutritionPrimaryGoal, Decimal> = {
  FAT_LOSS: new Decimal(2),
  MAINTENANCE: new Decimal('1.6'),
  MUSCLE_GAIN: new Decimal(2),
};

const fatCalorieRatio = new Decimal('0.25');
const fiberGramsPerThousandCalories = new Decimal(14);

export const NUTRITION_GOAL_CALCULATION_METHOD = 'MIFFLIN_ST_JEOR_V1';

export interface NutritionGoalCalculationInput {
  age: number;
  biologicalSex: NutritionBiologicalSex;
  weightKg: number;
  heightCm: number;
  activityLevel: NutritionActivityLevel;
  primaryGoal: NutritionPrimaryGoal;
}

export interface NutritionGoalCalculation {
  bmr: Decimal;
  activityFactor: Decimal;
  tdee: Decimal;
  calorieAdjustment: Decimal;
  dailyCalories: Decimal;
  proteinGrams: Decimal;
  carbohydrateGrams: Decimal;
  fatGrams: Decimal;
  fiberGrams: Decimal;
}

export class NutritionGoalCalculator {
  calculate(input: NutritionGoalCalculationInput): NutritionGoalCalculation {
    const weight = new Decimal(input.weightKg);
    const height = new Decimal(input.heightCm);
    const sexAdjustment = input.biologicalSex === 'MALE' ? new Decimal(5) : new Decimal(-161);
    const bmr = weight
      .times(10)
      .plus(height.times('6.25'))
      .minus(new Decimal(input.age).times(5))
      .plus(sexAdjustment);
    const activityFactor = activityFactors[input.activityLevel];
    const tdee = bmr.times(activityFactor);
    const calorieAdjustment = calorieAdjustments[input.primaryGoal];
    const dailyCalories = tdee.times(calorieAdjustment.plus(1));
    const protein = weight.times(proteinGramsPerKg[input.primaryGoal]);
    const fat = dailyCalories.times(fatCalorieRatio).dividedBy(9);
    const carbohydrates = dailyCalories.minus(protein.times(4)).minus(fat.times(9)).dividedBy(4);
    const fiber = dailyCalories.dividedBy(1000).times(fiberGramsPerThousandCalories);

    return {
      bmr: roundWhole(bmr),
      activityFactor,
      tdee: roundWhole(tdee),
      calorieAdjustment,
      dailyCalories: roundWhole(dailyCalories),
      proteinGrams: roundWhole(protein),
      carbohydrateGrams: roundWhole(carbohydrates),
      fatGrams: roundWhole(fat),
      fiberGrams: roundWhole(fiber),
    };
  }
}

function roundWhole(value: Decimal): Decimal {
  return value.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
}
