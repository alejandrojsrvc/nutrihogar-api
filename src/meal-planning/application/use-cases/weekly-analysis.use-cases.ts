import Decimal from 'decimal.js';
import type { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import type { InventoryItemRepository } from '../../../inventory/application/ports/inventory-repository.port';
import type { RecipeRepository } from '../../../recipes/application/ports/recipe-repository.port';
import type { WeeklyPlanRepository } from '../ports/weekly-plan-repository.port';
import { requireAccess, requirePlan } from './weekly-plan.use-cases';
import {
  calculateWeeklyRequirements,
  type WeeklyRequirementsResult,
} from '../services/weekly-requirements.service';

export const CALCULATE_WEEKLY_REQUIREMENTS_QUERY = Symbol('CalculateWeeklyRequirementsQuery');
export const COMPARE_PLAN_WITH_INVENTORY_QUERY = Symbol('ComparePlanWithInventoryQuery');

export type InventoryComparisonStatus = 'COMPLETE' | 'PARTIAL' | 'MISSING' | 'NOT_NEEDED';
export interface InventoryComparisonItem {
  foodId: string;
  name: string;
  unit: string;
  required: string;
  available: string;
  missing: string;
  coverage: string;
  status: InventoryComparisonStatus;
}
export interface InventoryComparisonResult extends WeeklyRequirementsResult {
  items: InventoryComparisonItem[];
}

type Deps = {
  households: HouseholdRepository;
  plans: WeeklyPlanRepository;
  recipes: RecipeRepository;
  inventory: InventoryItemRepository;
};

export class CalculateWeeklyRequirementsQuery {
  constructor(private readonly d: Pick<Deps, 'households' | 'plans' | 'recipes'>) {}
  async execute(actorId: string, planId: string): Promise<WeeklyRequirementsResult> {
    const plan = await requirePlan(this.d.plans, planId);
    await requireAccess(this.d.households, actorId, plan.householdId);
    const recipes = new Map(
      await Promise.all(
        plan.meals
          .filter((meal) => meal.recipeId)
          .map(
            async (meal) =>
              [
                meal.recipeId!,
                await this.d.recipes.findByIdForHousehold(meal.recipeId!, plan.householdId),
              ] as const,
          ),
      ),
    );
    return calculateWeeklyRequirements(plan, recipes);
  }
}

export class ComparePlanWithInventoryQuery {
  constructor(private readonly d: Deps) {}
  async execute(actorId: string, planId: string): Promise<InventoryComparisonResult> {
    const requirements = await new CalculateWeeklyRequirementsQuery(this.d).execute(
      actorId,
      planId,
    );
    const plan = await requirePlan(this.d.plans, planId);
    const inventory = await this.d.inventory.listByHousehold(plan.householdId, {
      page: 1,
      limit: 10000,
    });
    const now = new Date();
    const available = new Map<string, Decimal>();
    for (const item of inventory.items) {
      const props = item.toProps();
      if (!['FOOD', 'CUSTOM'].includes(props.itemType) || props.status !== 'ACTIVE') continue;
      if (props.expiresAt && props.expiresAt <= now) continue;
      if (!props.foodId) continue;
      const key = `${props.foodId}|${props.unit}`;
      available.set(key, (available.get(key) ?? new Decimal(0)).plus(props.currentQuantity));
    }
    return {
      warnings: requirements.warnings,
      items: requirements.items.map((requirement) => {
        const required = new Decimal(requirement.required);
        const stock = available.get(`${requirement.foodId}|${requirement.unit}`) ?? new Decimal(0);
        const missing = Decimal.max(required.minus(stock), 0);
        const coverage = required.isZero() ? new Decimal(1) : Decimal.min(stock.div(required), 1);
        const status: InventoryComparisonStatus = required.isZero()
          ? 'NOT_NEEDED'
          : missing.isZero()
            ? 'COMPLETE'
            : stock.isZero()
              ? 'MISSING'
              : 'PARTIAL';
        return {
          ...requirement,
          required: required.toString(),
          available: stock.toString(),
          missing: missing.toString(),
          coverage: coverage.toDecimalPlaces(3, Decimal.ROUND_HALF_UP).toString(),
          status,
        };
      }),
    };
  }
}
