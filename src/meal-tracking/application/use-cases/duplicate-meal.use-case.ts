import { NutritionEngineService } from '../../../nutrition/application/nutrition-engine.service';
import { Clock } from '../../../nutrition/application/ports/clock.port';
import { Meal } from '../../domain/entities/meal';
import { MealAlreadyCancelledError } from '../../domain/errors/meal.errors';
import { MealItemView, MealType } from '../../domain/models/meal.models';
import {
  MealAccessDeniedError,
  MealNotFoundError,
  MealProfileNotFoundError,
} from '../errors/meal-application.errors';
import { MealRepository, MealUnitOfWork, CreateMealInput } from '../ports/meal-repository.port';
import { calculateMealItems, MealItemCommand } from '../services/calculate-meal-items';
import { ensureMealDate } from './register-meal.use-case';

export const DUPLICATE_MEAL_USE_CASE = Symbol('DuplicateMealUseCase');

export interface DuplicateMealCommand {
  actorId: string;
  mealId: string;
  adultProfileId: string;
  mealType: MealType;
  consumedAt: Date;
}

export class DuplicateMealUseCase {
  constructor(
    private readonly meals: MealRepository,
    private readonly unitOfWork: MealUnitOfWork,
    private readonly nutritionEngine: NutritionEngineService,
    private readonly clock: Clock,
  ) {}

  async execute(command: DuplicateMealCommand) {
    const original = await this.meals.findById(command.mealId);
    if (!original) throw new MealNotFoundError();
    if (original.status === 'CANCELLED') throw new MealAlreadyCancelledError();
    if (!(await this.meals.findHouseholdAccess(command.actorId, original.householdId))) {
      throw new MealAccessDeniedError();
    }
    if (!(await this.meals.hasActiveProfile(command.adultProfileId, original.householdId))) {
      throw new MealProfileNotFoundError();
    }

    Meal.ensureHasItems(original.items);
    ensureMealDate(command.consumedAt, this.clock.now());
    const items = original.items.map(toItemCommand);
    const calculatedItems = await calculateMealItems(
      this.nutritionEngine,
      { actorId: command.actorId, householdId: original.householdId },
      items,
    );

    const input: CreateMealInput = {
      householdId: original.householdId,
      adultProfileId: command.adultProfileId,
      mealType: command.mealType,
      consumedAt: command.consumedAt,
      notes: original.notes,
      createdById: command.actorId,
      source: 'DUPLICATED',
      items: calculatedItems,
    };

    return this.unitOfWork.create(input);
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
