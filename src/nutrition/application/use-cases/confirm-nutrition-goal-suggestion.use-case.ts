import Decimal from 'decimal.js';
import { NutritionValues } from '../../domain/models/nutrition-goal.models';
import {
  createNutritionValues,
  requiredNutritionGoalText,
} from '../../domain/services/nutrition-goal-validation';
import {
  NutritionGoalAccessDeniedError,
  NutritionGoalSuggestionAlreadyHandledError,
  NutritionGoalSuggestionExpiredError,
  NutritionGoalSuggestionNotFoundError,
} from '../errors/nutrition-goal.errors';
import { Clock } from '../ports/clock.port';
import {
  NutritionGoalRepository,
  NutritionGoalUnitOfWork,
} from '../ports/nutrition-goal-repository.port';

export const CONFIRM_NUTRITION_GOAL_SUGGESTION_USE_CASE = Symbol(
  'ConfirmNutritionGoalSuggestionUseCase',
);

export interface ConfirmNutritionGoalSuggestionCommand {
  actorId: string;
  suggestionId: string;
  goalType: string;
  dailyCalories?: Decimal.Value;
  proteinGrams?: Decimal.Value;
  carbohydrateGrams?: Decimal.Value;
  fatGrams?: Decimal.Value;
  fiberGrams?: Decimal.Value;
}

export class ConfirmNutritionGoalSuggestionUseCase {
  constructor(
    private readonly goals: NutritionGoalRepository,
    private readonly unitOfWork: NutritionGoalUnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(command: ConfirmNutritionGoalSuggestionCommand) {
    const suggestion = await this.goals.findSuggestionById(command.suggestionId);
    if (!suggestion) throw new NutritionGoalSuggestionNotFoundError();

    if (!(await this.goals.canAccessProfile(command.actorId, suggestion.adultProfileId))) {
      throw new NutritionGoalAccessDeniedError();
    }
    if (suggestion.status !== 'PENDING') {
      throw new NutritionGoalSuggestionAlreadyHandledError();
    }

    const now = this.clock.now();
    if (suggestion.expiresAt <= now) {
      await this.unitOfWork.expireSuggestion(suggestion.id);
      throw new NutritionGoalSuggestionExpiredError();
    }

    const goal = await this.unitOfWork.confirmSuggestion({
      suggestionId: suggestion.id,
      adultProfileId: suggestion.adultProfileId,
      confirmedById: command.actorId,
      confirmedAt: now,
      values: editedValues(suggestion.values, command),
      goalType: requiredNutritionGoalText(command.goalType),
      calculationMethod: suggestion.calculationMethod,
      calculationInput: structuredClone(suggestion.calculationInput),
    });
    if (!goal) throw new NutritionGoalSuggestionAlreadyHandledError();

    return goal;
  }
}

function editedValues(
  suggested: NutritionValues,
  command: ConfirmNutritionGoalSuggestionCommand,
): NutritionValues {
  return createNutritionValues({
    calories: command.dailyCalories ?? suggested.calories,
    proteinGrams: command.proteinGrams ?? suggested.proteinGrams,
    carbohydrateGrams: command.carbohydrateGrams ?? suggested.carbohydrateGrams,
    fatGrams: command.fatGrams ?? suggested.fatGrams,
    fiberGrams: command.fiberGrams ?? suggested.fiberGrams,
  });
}
