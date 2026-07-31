import { NutritionEngineService } from '../../../nutrition/application/nutrition-engine.service';
import { Clock } from '../../../nutrition/application/ports/clock.port';
import { Meal } from '../../domain/entities/meal';
import { MealItemView, MealType } from '../../domain/models/meal.models';
import { MealNotFoundError, MealAccessDeniedError } from '../errors/meal-application.errors';
import { calculateMealItems, MealItemCommand } from '../services/calculate-meal-items';
import { ensureMealDate } from './register-meal.use-case';
import { MealRepository, MealUnitOfWork, ReplaceMealInput } from '../ports/meal-repository.port';

export const UPDATE_MEAL_USE_CASE = Symbol('UpdateMealUseCase');

export interface UpdateMealCommand {
  actorId: string;
  mealId: string;
  mealType?: MealType;
  consumedAt?: Date;
  notes?: string | null;
  items?: MealItemCommand[];
}

export class UpdateMealUseCase {
  constructor(
    private readonly meals: MealRepository,
    private readonly unitOfWork: MealUnitOfWork,
    private readonly nutritionEngine: NutritionEngineService,
    private readonly clock: Clock,
  ) {}

  async execute(command: UpdateMealCommand) {
    const meal = await this.meals.findById(command.mealId);
    if (!meal) throw new MealNotFoundError();
    if (!(await this.meals.findHouseholdAccess(command.actorId, meal.householdId))) {
      throw new MealAccessDeniedError();
    }
    Meal.ensureCanBeEdited(meal.status);

    const items = command.items ?? meal.items.map(toItemCommand);
    Meal.ensureHasItems(items);
    const consumedAt = command.consumedAt ?? meal.consumedAt;
    ensureMealDate(consumedAt, this.clock.now());
    const calculatedItems = await calculateMealItems(
      this.nutritionEngine,
      {
        actorId: command.actorId,
        householdId: meal.householdId,
      },
      items,
    );

    const input: ReplaceMealInput = {
      mealId: meal.id,
      householdId: meal.householdId,
      adultProfileId: meal.adultProfileId,
      mealType: command.mealType ?? meal.mealType,
      consumedAt,
      notes: command.notes === undefined ? meal.notes : command.notes,
      createdById: meal.createdById,
      source: meal.source,
      items: calculatedItems,
    };
    const updated = await this.unitOfWork.replace(input);
    if (!updated) throw new MealNotFoundError();

    return updated;
  }
}

function toItemCommand(item: MealItemView): MealItemCommand {
  if (!item.foodId) throw new MealNotFoundError();

  return {
    foodId: item.foodId,
    quantity: item.quantity.toString(),
    unit: item.unit as MealItemCommand['unit'],
    servingId: item.foodServingId ?? undefined,
    measurementMethod: item.measurementMethod,
  };
}
