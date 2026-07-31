import Decimal from 'decimal.js';
import { NutritionEngineService } from '../../../nutrition/application/nutrition-engine.service';
import { Clock } from '../../../nutrition/application/ports/clock.port';
import { Meal } from '../../domain/entities/meal';
import { InvalidMealDateError } from '../../domain/errors/meal.errors';
import { MealType } from '../../domain/models/meal.models';
import { MealAccessDeniedError, MealProfileNotFoundError } from '../errors/meal-application.errors';
import { CreateMealInput, MealRepository, MealUnitOfWork } from '../ports/meal-repository.port';

export const REGISTER_MEAL_USE_CASE = Symbol('RegisterMealUseCase');

export interface RegisterMealItemCommand {
  foodId: string;
  quantity: number | string;
  unit: 'GRAM' | 'MILLILITER' | 'UNIT' | 'SERVING';
  servingId?: string;
  measurementMethod: 'WEIGHED' | 'SERVING' | 'UNIT' | 'APPROXIMATED';
}

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

    const calculatedItems = await Promise.all(
      command.items.map(async (item) => {
        const calculation = await this.nutritionEngine.calculate({
          actorId: command.actorId,
          householdId: command.householdId,
          foodId: item.foodId,
          quantity: item.quantity,
          unit: item.unit,
          servingId: item.servingId,
        });

        return {
          foodId: item.foodId,
          foodServingId: item.servingId,
          nameSnapshot: calculation.foodName ?? item.foodId,
          brandSnapshot: calculation.foodBrand ?? null,
          preparationStateSnapshot: calculation.preparationState ?? 'NOT_APPLICABLE',
          quantity: decimal(item.quantity),
          unit: item.unit,
          baseQuantity: calculation.baseQuantity,
          baseUnit: calculation.baseUnit,
          measurementMethod: item.measurementMethod,
          confidenceLevel: calculation.confidenceLevel ?? 'USER_PROVIDED',
          nutrients: Object.entries(calculation.nutrients).map(([code, amount]) => ({
            code,
            name: calculation.nutrientMetadata[code]?.name ?? code,
            unit: calculation.nutrientMetadata[code]?.unit ?? calculation.baseUnit,
            amount,
          })),
        };
      }),
    );

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

function ensureMealDate(consumedAt: Date, now: Date): void {
  const timestamp = consumedAt.getTime();
  if (!Number.isFinite(timestamp) || timestamp > now.getTime() + 5 * 60 * 1000) {
    throw new InvalidMealDateError();
  }
}

function decimal(value: number | string): Decimal {
  return new Decimal(value);
}
