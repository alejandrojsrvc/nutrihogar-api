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

export const REJECT_NUTRITION_GOAL_SUGGESTION_USE_CASE = Symbol(
  'RejectNutritionGoalSuggestionUseCase',
);

export interface RejectNutritionGoalSuggestionCommand {
  actorId: string;
  suggestionId: string;
}

export class RejectNutritionGoalSuggestionUseCase {
  constructor(
    private readonly goals: NutritionGoalRepository,
    private readonly unitOfWork: NutritionGoalUnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(command: RejectNutritionGoalSuggestionCommand): Promise<void> {
    const suggestion = await this.goals.findSuggestionById(command.suggestionId);
    if (!suggestion) throw new NutritionGoalSuggestionNotFoundError();

    if (!(await this.goals.canAccessProfile(command.actorId, suggestion.adultProfileId))) {
      throw new NutritionGoalAccessDeniedError();
    }
    if (suggestion.status !== 'PENDING') {
      throw new NutritionGoalSuggestionAlreadyHandledError();
    }

    const rejectedAt = this.clock.now();
    if (suggestion.expiresAt <= rejectedAt) {
      await this.unitOfWork.expireSuggestion(suggestion.id);
      throw new NutritionGoalSuggestionExpiredError();
    }

    const rejected = await this.unitOfWork.rejectSuggestion({
      suggestionId: suggestion.id,
      rejectedAt,
    });
    if (!rejected) throw new NutritionGoalSuggestionAlreadyHandledError();
  }
}
