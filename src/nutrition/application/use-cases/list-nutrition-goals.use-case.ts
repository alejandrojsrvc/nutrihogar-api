import { NutritionGoalAccessDeniedError } from '../errors/nutrition-goal.errors';
import { NutritionGoalRepository } from '../ports/nutrition-goal-repository.port';

export const LIST_NUTRITION_GOALS_USE_CASE = Symbol('ListNutritionGoalsUseCase');

export interface ListNutritionGoalsCommand {
  actorId: string;
  adultProfileId: string;
}

export class ListNutritionGoalsUseCase {
  constructor(private readonly goals: NutritionGoalRepository) {}

  async execute(command: ListNutritionGoalsCommand) {
    if (!(await this.goals.canAccessProfile(command.actorId, command.adultProfileId))) {
      throw new NutritionGoalAccessDeniedError();
    }

    return this.goals.listByProfile(command.adultProfileId);
  }
}
