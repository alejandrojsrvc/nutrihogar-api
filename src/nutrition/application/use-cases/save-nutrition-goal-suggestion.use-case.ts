import Decimal from 'decimal.js';
import { CalculationSnapshot } from '../../domain/models/nutrition-goal.models';
import {
  createNutritionValues,
  createPositiveDecimal,
  ensureFutureExpiration,
  requiredNutritionGoalText,
} from '../../domain/services/nutrition-goal-validation';
import { NutritionGoalAccessDeniedError } from '../errors/nutrition-goal.errors';
import { Clock } from '../ports/clock.port';
import {
  NutritionGoalRepository,
  NutritionGoalUnitOfWork,
} from '../ports/nutrition-goal-repository.port';

export const SAVE_NUTRITION_GOAL_SUGGESTION_USE_CASE = Symbol('SaveNutritionGoalSuggestionUseCase');

export interface SaveNutritionGoalSuggestionCommand {
  actorId: string;
  adultProfileId: string;
  calculationMethod: string;
  calculationInput: CalculationSnapshot;
  bmr: Decimal.Value;
  tdee: Decimal.Value;
  suggestedCalories: Decimal.Value;
  suggestedProteinGrams: Decimal.Value;
  suggestedCarbohydrateGrams: Decimal.Value;
  suggestedFatGrams: Decimal.Value;
  suggestedFiberGrams: Decimal.Value;
  expiresAt: Date;
}

export class SaveNutritionGoalSuggestionUseCase {
  constructor(
    private readonly goals: NutritionGoalRepository,
    private readonly unitOfWork: NutritionGoalUnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(command: SaveNutritionGoalSuggestionCommand) {
    if (!(await this.goals.canAccessProfile(command.actorId, command.adultProfileId))) {
      throw new NutritionGoalAccessDeniedError();
    }

    const now = this.clock.now();
    ensureFutureExpiration(command.expiresAt, now);

    return this.unitOfWork.createSuggestion({
      adultProfileId: command.adultProfileId,
      calculationMethod: requiredNutritionGoalText(command.calculationMethod),
      calculationInput: structuredClone(command.calculationInput),
      bmr: createPositiveDecimal(command.bmr),
      tdee: createPositiveDecimal(command.tdee),
      values: createNutritionValues({
        calories: command.suggestedCalories,
        proteinGrams: command.suggestedProteinGrams,
        carbohydrateGrams: command.suggestedCarbohydrateGrams,
        fatGrams: command.suggestedFatGrams,
        fiberGrams: command.suggestedFiberGrams,
      }),
      createdAt: now,
      expiresAt: command.expiresAt,
    });
  }
}
