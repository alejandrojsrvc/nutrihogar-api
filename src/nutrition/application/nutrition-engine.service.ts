import Decimal from 'decimal.js';
import { NutrientAggregator } from '../domain/services/nutrient-aggregator';
import { NutritionCalculator } from '../domain/services/nutrition-calculator';
import { UnitConverter } from '../domain/services/unit-converter';
import {
  ConsumedFoodUnit,
  NutritionCalculation,
  NutrientAmounts,
} from '../domain/models/nutrition-engine.models';
import { FoodNotAvailableError } from './errors/food-not-available.error';
import { NutritionFoodRepository } from './ports/nutrition-food-repository.port';

export const NUTRITION_ENGINE_SERVICE = Symbol('NutritionEngineService');

export interface CalculateFoodNutritionCommand {
  actorId: string;
  householdId: string;
  foodId: string;
  quantity: Decimal.Value;
  unit: ConsumedFoodUnit;
  servingId?: string;
}

export interface NutritionBatchCalculation {
  items: NutritionCalculation[];
  nutrients: NutrientAmounts;
}

export class NutritionEngineService {
  constructor(
    private readonly foods: NutritionFoodRepository,
    private readonly unitConverter: UnitConverter,
    private readonly calculator: NutritionCalculator,
    private readonly aggregator: NutrientAggregator,
  ) {}

  async calculate(command: CalculateFoodNutritionCommand): Promise<NutritionCalculation> {
    const food = await this.foods.findVisibleById({
      actorId: command.actorId,
      householdId: command.householdId,
      foodId: command.foodId,
    });
    if (!food) throw new FoodNotAvailableError(command.foodId);

    const base = this.unitConverter.toBaseQuantity(food, {
      quantity: command.quantity,
      unit: command.unit,
      servingId: command.servingId,
    });

    return this.calculator.calculate(food, base);
  }

  async calculateMany(
    commands: CalculateFoodNutritionCommand[],
  ): Promise<NutritionBatchCalculation> {
    const items = await Promise.all(commands.map((command) => this.calculate(command)));
    return {
      items,
      nutrients: this.aggregator.sum(items.map((item) => item.nutrients)),
    };
  }
}
