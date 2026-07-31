import { MealNotFoundError, MealAccessDeniedError } from '../errors/meal-application.errors';
import { MealRepository } from '../ports/meal-repository.port';

export const GET_MEAL_USE_CASE = Symbol('GetMealUseCase');

export class GetMealUseCase {
  constructor(private readonly meals: MealRepository) {}

  async execute(actorId: string, mealId: string) {
    const meal = await this.meals.findById(mealId);
    if (!meal) throw new MealNotFoundError();
    if (!(await this.meals.findHouseholdAccess(actorId, meal.householdId))) {
      throw new MealAccessDeniedError();
    }

    return meal;
  }
}
