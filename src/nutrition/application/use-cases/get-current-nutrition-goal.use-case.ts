import { NutritionGoalAccessDeniedError } from '../errors/nutrition-goal.errors';
import { NutritionGoalRepository } from '../ports/nutrition-goal-repository.port';

export const GET_CURRENT_NUTRITION_GOAL_USE_CASE = Symbol('GetCurrentNutritionGoalUseCase');

export interface GetCurrentNutritionGoalCommand {
  actorId: string;
  adultProfileId: string;
}

export class GetCurrentNutritionGoalUseCase {
  constructor(private readonly goals: NutritionGoalRepository) {}

  async execute(command: GetCurrentNutritionGoalCommand) {
    await ensureProfileAccess(this.goals, command.actorId, command.adultProfileId);

    return this.goals.findCurrentByProfile(command.adultProfileId);
  }
}

async function ensureProfileAccess(
  goals: NutritionGoalRepository,
  actorId: string,
  adultProfileId: string,
): Promise<void> {
  if (!(await goals.canAccessProfile(actorId, adultProfileId))) {
    throw new NutritionGoalAccessDeniedError();
  }
}
