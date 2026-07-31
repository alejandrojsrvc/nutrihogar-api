import { Clock } from '../../../nutrition/application/ports/clock.port';
import { Meal } from '../../domain/entities/meal';
import { MealAccessDeniedError, MealNotFoundError } from '../errors/meal-application.errors';
import { MealRepository, MealUnitOfWork } from '../ports/meal-repository.port';

export const CANCEL_MEAL_USE_CASE = Symbol('CancelMealUseCase');

export class CancelMealUseCase {
  constructor(
    private readonly meals: MealRepository,
    private readonly unitOfWork: MealUnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(actorId: string, mealId: string): Promise<void> {
    const meal = await this.meals.findById(mealId);
    if (!meal) throw new MealNotFoundError();
    if (!(await this.meals.findHouseholdAccess(actorId, meal.householdId))) {
      throw new MealAccessDeniedError();
    }
    Meal.ensureCanBeCancelled(meal.status);

    const cancelled = await this.unitOfWork.cancel({ mealId, deletedAt: this.clock.now() });
    if (!cancelled) throw new MealNotFoundError();
  }
}
