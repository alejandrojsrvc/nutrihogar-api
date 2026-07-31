import { NutritionEngineService } from '../../../nutrition/application/nutrition-engine.service';
import { Clock } from '../../../nutrition/application/ports/clock.port';
import { Meal } from '../../domain/entities/meal';
import { InvalidMealDateError } from '../../domain/errors/meal.errors';
import { MealType } from '../../domain/models/meal.models';
import { MealAccessDeniedError, MealProfileNotFoundError } from '../errors/meal-application.errors';
import { CreateMealInput, MealRepository, MealUnitOfWork } from '../ports/meal-repository.port';
import { calculateMealItems, MealItemCommand } from '../services/calculate-meal-items';

export const REGISTER_MEAL_USE_CASE = Symbol('RegisterMealUseCase');

export type RegisterMealItemCommand = MealItemCommand;

export interface RegisterMealCommand {
  actorId: string;
  householdId: string;
  adultProfileId: string;
  mealType: MealType;
  consumedAt: Date;
  notes?: string | null;
  items: RegisterMealItemCommand[];
}

export class RegisterMealUseCase {
  constructor(
    private readonly meals: MealRepository,
    private readonly unitOfWork: MealUnitOfWork,
    private readonly nutritionEngine: NutritionEngineService,
    private readonly clock: Clock,
  ) {}

  async execute(command: RegisterMealCommand) {
    const access = await this.meals.findHouseholdAccess(command.actorId, command.householdId);
    if (!access) throw new MealAccessDeniedError();
    if (!(await this.meals.hasActiveProfile(command.adultProfileId, command.householdId))) {
      throw new MealProfileNotFoundError();
    }

    Meal.ensureHasItems(command.items);
    ensureMealDate(command.consumedAt, this.clock.now());

    const calculatedItems = await calculateMealItems(this.nutritionEngine, command, command.items);

    const input: CreateMealInput = {
      householdId: command.householdId,
      adultProfileId: command.adultProfileId,
      mealType: command.mealType,
      consumedAt: command.consumedAt,
      notes: command.notes ?? null,
      createdById: command.actorId,
      source: 'MANUAL',
      items: calculatedItems,
    };

    return this.unitOfWork.create(input);
  }
}

export function ensureMealDate(consumedAt: Date, now: Date): void {
  const timestamp = consumedAt.getTime();
  if (!Number.isFinite(timestamp) || timestamp > now.getTime() + 5 * 60 * 1000) {
    throw new InvalidMealDateError();
  }
}
