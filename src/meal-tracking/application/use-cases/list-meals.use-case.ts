import {
  MealAdministrativeAccessDeniedError,
  MealAccessDeniedError,
} from '../errors/meal-application.errors';
import { toUtcMealDateRange } from '../services/meal-date-range';
import { MealRepository } from '../ports/meal-repository.port';
import { MealType } from '../../domain/models/meal.models';

export const LIST_MEALS_USE_CASE = Symbol('ListMealsUseCase');

export interface ListMealsCommand {
  actorId: string;
  householdId: string;
  adultProfileId?: string;
  dateFrom?: string;
  dateTo?: string;
  mealType?: MealType;
  page: number;
  limit: number;
  includeCancelled: boolean;
}

export class ListMealsUseCase {
  constructor(private readonly meals: MealRepository) {}

  async execute(command: ListMealsCommand) {
    const access = await this.meals.findHouseholdAccess(command.actorId, command.householdId);
    if (!access) throw new MealAccessDeniedError();
    if (command.includeCancelled && access.role !== 'ADMIN') {
      throw new MealAdministrativeAccessDeniedError();
    }

    const range = toUtcMealDateRange(command, access.timezone);
    return this.meals.list({
      householdId: command.householdId,
      adultProfileId: command.adultProfileId,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      mealType: command.mealType,
      includeCancelled: command.includeCancelled,
      page: command.page,
      limit: command.limit,
    });
  }
}
