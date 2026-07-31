import {
  IncompleteNutritionGoalProfileError,
  InvalidNutritionGoalProfileAgeError,
  NutritionGoalAccessDeniedError,
  NutritionGoalProfileNotFoundError,
} from '../errors/nutrition-goal.errors';
import { Clock } from '../ports/clock.port';
import {
  NutritionGoalRepository,
  NutritionGoalUnitOfWork,
} from '../ports/nutrition-goal-repository.port';
import { NutritionProfileRepository } from '../ports/nutrition-profile-repository.port';
import {
  NUTRITION_GOAL_CALCULATION_METHOD,
  NutritionGoalCalculation,
  NutritionGoalCalculator,
} from '../../domain/services/nutrition-goal-calculator';

export const GENERATE_NUTRITION_GOAL_SUGGESTION_USE_CASE = Symbol(
  'GenerateNutritionGoalSuggestionUseCase',
);

export interface GenerateNutritionGoalSuggestionCommand {
  actorId: string;
  adultProfileId: string;
}

export class GenerateNutritionGoalSuggestionUseCase {
  constructor(
    private readonly goals: NutritionGoalRepository,
    private readonly profiles: NutritionProfileRepository,
    private readonly unitOfWork: NutritionGoalUnitOfWork,
    private readonly calculator: NutritionGoalCalculator,
    private readonly clock: Clock,
  ) {}

  async execute(command: GenerateNutritionGoalSuggestionCommand) {
    if (!(await this.goals.canAccessProfile(command.actorId, command.adultProfileId))) {
      throw new NutritionGoalAccessDeniedError();
    }

    const profile = await this.profiles.findActiveById(command.adultProfileId);
    if (!profile) throw new NutritionGoalProfileNotFoundError();
    const weightKg = profile.weightKg;
    const heightCm = profile.heightCm;
    if (weightKg == null || weightKg <= 0) {
      throw new IncompleteNutritionGoalProfileError('weightKg');
    }
    if (heightCm == null || heightCm <= 0) {
      throw new IncompleteNutritionGoalProfileError('heightCm');
    }

    const now = this.clock.now();
    const age = calculateAge(profile.birthDate, now);
    if (age < 18 || age > 120) throw new InvalidNutritionGoalProfileAgeError();

    const calculation = this.calculator.calculate({
      age,
      biologicalSex: profile.biologicalSex,
      weightKg,
      heightCm,
      activityLevel: profile.activityLevel,
      primaryGoal: profile.primaryGoal,
    });
    const suggestion = await this.unitOfWork.createSuggestion({
      adultProfileId: profile.id,
      calculationMethod: NUTRITION_GOAL_CALCULATION_METHOD,
      calculationInput: createSnapshot({ ...profile, weightKg, heightCm }, age, calculation),
      bmr: calculation.bmr,
      tdee: calculation.tdee,
      values: {
        calories: calculation.dailyCalories,
        proteinGrams: calculation.proteinGrams,
        carbohydrateGrams: calculation.carbohydrateGrams,
        fatGrams: calculation.fatGrams,
        fiberGrams: calculation.fiberGrams,
      },
      createdAt: now,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    });

    return { suggestion, activityFactor: calculation.activityFactor };
  }
}

function calculateAge(birthDate: Date, today: Date): number {
  if (Number.isNaN(birthDate.getTime()) || birthDate > today) {
    throw new InvalidNutritionGoalProfileAgeError();
  }

  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDifference = today.getUTCMonth() - birthDate.getUTCMonth();
  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getUTCDate() < birthDate.getUTCDate())
  ) {
    age -= 1;
  }

  return age;
}

function createSnapshot(
  profile: {
    birthDate: Date;
    biologicalSex: string;
    weightKg: number;
    heightCm: number;
    activityLevel: string;
    primaryGoal: string;
  },
  age: number,
  calculation: NutritionGoalCalculation,
) {
  return {
    formulaVersion: NUTRITION_GOAL_CALCULATION_METHOD,
    birthDate: profile.birthDate.toISOString().slice(0, 10),
    age,
    biologicalSex: profile.biologicalSex,
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
    activityLevel: profile.activityLevel,
    activityFactor: calculation.activityFactor.toNumber(),
    primaryGoal: profile.primaryGoal,
    calorieAdjustment: calculation.calorieAdjustment.toNumber(),
    proteinGramsPerKg:
      profile.weightKg === 0 ? 0 : calculation.proteinGrams.dividedBy(profile.weightKg).toNumber(),
    fatCalorieRatio: 0.25,
    fiberGramsPerThousandCalories: 14,
  };
}
