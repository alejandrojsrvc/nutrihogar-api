import type { AdultProfileView } from '../../../households/application/adult-profile-models/adult-profile-view';
import type { AdultProfileRepository } from '../../../households/application/adult-profile-ports/adult-profile-repository.port';
import type { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import type { RecipeRepository } from '../../../recipes/application/ports/recipe-repository.port';
import { resolveRecipeAccessContext } from '../../../recipes/application/services/resolve-recipe-access';
import type { NutritionEngineService } from '../../../nutrition/application/nutrition-engine.service';
import Decimal from 'decimal.js';
import { PlannedMealSource, PlannedMealType } from '../../domain/value-objects/planned-meal';
import { WeeklyPlan } from '../../domain/entities/weekly-plan';
import type { WeeklyPlanRepository } from '../ports/weekly-plan-repository.port';
import type { PlannedMealProps } from '../../domain/models/meal-planning.models';
import {
  AdultProfileNotFoundError,
  PlannedMealNotFoundError,
} from '../errors/meal-planning-application.errors';
import { requireAccess, requirePlan } from './weekly-plan.use-cases';
import type { PlannedMealInput } from './weekly-plan.use-cases';

export const ADD_PLANNED_MEAL_USE_CASE = Symbol('AddPlannedMealUseCase');
export const UPDATE_PLANNED_MEAL_USE_CASE = Symbol('UpdatePlannedMealUseCase');
export const REMOVE_PLANNED_MEAL_USE_CASE = Symbol('RemovePlannedMealUseCase');
export const REPLACE_PLANNED_MEAL_USE_CASE = Symbol('ReplacePlannedMealUseCase');
export const ASSIGN_PLANNED_MEAL_PARTICIPANTS_USE_CASE = Symbol(
  'AssignPlannedMealParticipantsUseCase',
);
export const REMOVE_PLANNED_MEAL_PARTICIPANT_USE_CASE = Symbol(
  'RemovePlannedMealParticipantUseCase',
);
export const UPDATE_PLANNED_MEAL_PARTICIPANT_USE_CASE = Symbol(
  'UpdatePlannedMealParticipantUseCase',
);
export const CONFIRM_PARTICIPANT_QUANTITY_USE_CASE = Symbol('ConfirmParticipantQuantityUseCase');

type Dependencies = {
  households: HouseholdRepository;
  plans: WeeklyPlanRepository;
  recipes: RecipeRepository;
};
type ActorInput = { actorId: string; planId?: string };

export class AddPlannedMealUseCase {
  constructor(
    private readonly d: Dependencies,
    private readonly nutritionEngine: NutritionEngineService,
  ) {}
  async execute(
    input: Omit<ActorInput, 'planId'> & { planId: string } & PlannedMealInput,
  ): Promise<WeeklyPlan> {
    const plan = await requirePlan(this.d.plans, input.planId);
    await requireAccess(this.d.households, input.actorId, plan.householdId);
    await validateRecipe(this.d.recipes, input.source, input.recipeId, plan.householdId);
    const nutritionSnapshot = await resolveMealNutritionSnapshot(
      this.d,
      this.nutritionEngine,
      input.actorId,
      input.source,
      input.recipeId,
      plan.householdId,
      undefined,
    );
    plan.addMeal({
      ...input,
      id: crypto.randomUUID(),
      occurredAt: new Date(),
      nutritionSnapshot,
    });
    await this.d.plans.save(plan);
    return plan;
  }
}
export class UpdatePlannedMealUseCase {
  constructor(
    private readonly d: Dependencies,
    private readonly nutritionEngine: NutritionEngineService,
  ) {}
  async execute(
    input: ActorInput & {
      mealId: string;
      type?: PlannedMealType;
      source?: PlannedMealSource;
      recipeId?: string | null;
      nameSnapshot?: string | null;
      notes?: string | null;
      position?: number;
    },
  ): Promise<WeeklyPlan> {
    const plan = await planForMeal(this.d.plans, input.planId, input.mealId);
    await requireAccess(this.d.households, input.actorId, plan.householdId);
    const meal = findMeal(plan, input.mealId);
    const source = input.source ?? meal.source;
    const recipeId = input.recipeId === undefined ? meal.recipeId : input.recipeId;
    await validateRecipe(this.d.recipes, source, recipeId, plan.householdId);
    const nutritionSnapshot = await resolveMealNutritionSnapshot(
      this.d,
      this.nutritionEngine,
      input.actorId,
      source,
      recipeId,
      plan.householdId,
      input.recipeId === undefined ? meal.nutritionSnapshot : undefined,
    );
    plan.updateMeal(input.mealId, {
      ...input,
      occurredAt: new Date(),
      nutritionSnapshot,
    });
    await this.d.plans.save(plan);
    return plan;
  }
}
export class RemovePlannedMealUseCase {
  constructor(private readonly d: Dependencies) {}
  async execute(input: ActorInput & { mealId: string }): Promise<WeeklyPlan> {
    const plan = await planForMeal(this.d.plans, input.planId, input.mealId);
    await requireAccess(this.d.households, input.actorId, plan.householdId);
    findMeal(plan, input.mealId);
    plan.removeMeal(input.mealId);
    await this.d.plans.save(plan);
    return plan;
  }
}
export class ReplacePlannedMealUseCase {
  constructor(
    private readonly d: Dependencies,
    private readonly nutritionEngine: NutritionEngineService,
  ) {}
  async execute(
    input: ActorInput & { mealId: string } & Partial<PlannedMealInput> & { reason?: string | null },
  ): Promise<WeeklyPlan> {
    const plan = await planForMeal(this.d.plans, input.planId, input.mealId);
    await requireAccess(this.d.households, input.actorId, plan.householdId);
    const meal = findMeal(plan, input.mealId);
    const source = input.source ?? PlannedMealSource.FREE_MEAL;
    await validateRecipe(this.d.recipes, source, input.recipeId, plan.householdId);
    const nutritionSnapshot = await resolveMealNutritionSnapshot(
      this.d,
      this.nutritionEngine,
      input.actorId,
      source,
      input.recipeId,
      plan.householdId,
      undefined,
    );
    plan.replaceMeal(input.mealId, {
      ...input,
      source,
      type: input.type ?? meal.type,
      position: input.position ?? meal.position,
      notes: input.reason ?? input.notes,
      id: crypto.randomUUID(),
      occurredAt: new Date(),
      nutritionSnapshot,
    });
    await this.d.plans.save(plan);
    return plan;
  }
}

export class AssignPlannedMealParticipantsUseCase {
  constructor(
    private readonly d: Dependencies,
    private readonly profiles: AdultProfileRepository,
  ) {}
  async execute(
    input: ActorInput & { mealId: string; adultProfileId: string; notes?: string | null },
  ): Promise<WeeklyPlan> {
    const plan = await planForMeal(this.d.plans, input.planId, input.mealId);
    await requireAccess(this.d.households, input.actorId, plan.householdId);
    findMeal(plan, input.mealId);
    await requireProfile(this.profiles, input.adultProfileId, plan.householdId);
    plan.assignParticipant(input.mealId, {
      id: crypto.randomUUID(),
      adultProfileId: input.adultProfileId,
      notes: input.notes,
      occurredAt: new Date(),
    });
    await this.d.plans.save(plan);
    return plan;
  }
}
export class RemovePlannedMealParticipantUseCase {
  constructor(private readonly d: Dependencies) {}
  async execute(input: {
    actorId: string;
    participantId: string;
    planId?: string;
    mealId?: string;
  }): Promise<WeeklyPlan> {
    const plan = input.planId
      ? await requirePlan(this.d.plans, input.planId)
      : await this.d.plans.findByParticipantId(input.participantId);
    if (!plan) throw new PlannedMealNotFoundError('Participant not found.');
    await requireAccess(this.d.households, input.actorId, plan.householdId);
    const meal = input.mealId
      ? findMeal(plan, input.mealId)
      : plan.meals.find((item) => item.participants.some((p) => p.id === input.participantId));
    if (!meal) throw new PlannedMealNotFoundError('Planned meal not found.');
    plan.removeParticipant(meal.id, input.participantId);
    await this.d.plans.save(plan);
    await this.d.plans.deleteParticipant(input.participantId);
    return plan;
  }
}
export class UpdatePlannedMealParticipantUseCase {
  constructor(private readonly d: Dependencies) {}
  async execute(
    input: ActorInput & {
      mealId?: string;
      participantId: string;
      notes?: string | null;
      suggestedQuantity?: string | number | null;
      suggestedUnit?: string | null;
      nutritionTargetSnapshot?: Record<string, unknown> | null;
      confirmedQuantity?: string | number | null;
      confirmedUnit?: string | null;
      servingQuantity?: string | number | null;
      servingUnit?: string | null;
    },
  ): Promise<WeeklyPlan> {
    const plan = input.planId
      ? await requirePlan(this.d.plans, input.planId)
      : await this.d.plans.findByParticipantId(input.participantId);
    if (!plan) throw new PlannedMealNotFoundError('Participant not found.');
    await requireAccess(this.d.households, input.actorId, plan.householdId);
    const meal = input.mealId
      ? findMeal(plan, input.mealId)
      : plan.meals.find((item) => item.participants.some((p) => p.id === input.participantId));
    if (!meal) throw new PlannedMealNotFoundError('Planned meal not found.');
    const confirmationQuantity = input.confirmedQuantity ?? input.servingQuantity;
    const confirmationUnit = input.confirmedUnit ?? input.servingUnit;
    if (confirmationQuantity != null && confirmationUnit) {
      plan.confirmParticipantQuantity(
        meal.id,
        input.participantId,
        confirmationQuantity,
        confirmationUnit,
        input.actorId,
      );
    }
    if (input.suggestedQuantity === undefined && input.notes === undefined) {
      await this.d.plans.save(plan);
      return plan;
    }
    plan.updateParticipant(meal.id, input.participantId, {
      notes: input.notes,
      suggestedQuantity: input.suggestedQuantity,
      suggestedUnit: input.suggestedUnit,
      nutritionTargetSnapshot: input.nutritionTargetSnapshot,
      occurredAt: new Date(),
    });
    await this.d.plans.save(plan);
    return plan;
  }
}

export class ConfirmParticipantQuantityUseCase {
  constructor(private readonly d: Dependencies) {}
  async execute(
    input: ActorInput & {
      participantId: string;
      quantity: string | number;
      unit: string;
    },
  ): Promise<WeeklyPlan> {
    const plan = await (input.planId
      ? requirePlan(this.d.plans, input.planId)
      : this.d.plans.findByParticipantId(input.participantId));
    if (!plan) throw new PlannedMealNotFoundError('Participant not found.');
    await requireAccess(this.d.households, input.actorId, plan.householdId);
    const meal = plan.meals.find((item) =>
      item.participants.some((p) => p.id === input.participantId),
    );
    if (!meal) throw new PlannedMealNotFoundError('Planned meal not found.');
    plan.confirmParticipantQuantity(
      meal.id,
      input.participantId,
      input.quantity,
      input.unit,
      input.actorId,
    );
    await this.d.plans.save(plan);
    return plan;
  }
}

function findMeal(plan: WeeklyPlan, mealId: string): PlannedMealProps {
  const meal = plan.meals.find((item) => item.id === mealId);
  if (!meal) throw new PlannedMealNotFoundError('Planned meal not found.');
  return meal;
}
async function planForMeal(
  plans: WeeklyPlanRepository,
  planId: string | undefined,
  mealId: string,
): Promise<WeeklyPlan> {
  const plan = planId ? await requirePlan(plans, planId) : await plans.findByMealId(mealId);
  if (!plan) throw new PlannedMealNotFoundError('Planned meal not found.');
  return plan;
}
async function validateRecipe(
  recipes: RecipeRepository,
  source: PlannedMealSource,
  recipeId: string | null | undefined,
  householdId: string,
): Promise<void> {
  if (source !== PlannedMealSource.RECIPE) return;
  const recipe = recipeId && (await recipes.findByIdForHousehold(recipeId, householdId));
  if (!recipe || recipe.status !== 'ACTIVE')
    throw new PlannedMealNotFoundError('Recipe is not available for this household.');
}

async function resolveMealNutritionSnapshot(
  d: Dependencies,
  nutritionEngine: NutritionEngineService,
  actorId: string,
  source: PlannedMealSource,
  recipeId: string | null | undefined,
  householdId: string,
  fallback: Record<string, unknown> | null | undefined,
): Promise<Record<string, unknown> | null> {
  if (source !== PlannedMealSource.RECIPE || !recipeId) return fallback ?? null;
  const recipe = await d.recipes.findByIdForHousehold(recipeId, householdId);
  if (!recipe || recipe.status !== 'ACTIVE') return null;
  try {
    const { householdId: contextHouseholdId } = await resolveRecipeAccessContext(
      d.households,
      actorId,
      recipe,
    );
    const calculation = await nutritionEngine.calculateMany(
      recipe.ingredients.map((ingredient) => ({
        actorId,
        householdId: contextHouseholdId,
        foodId: ingredient.foodId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        servingId: ingredient.servingId ?? undefined,
      })),
    );
    const perServing = divideNutrients(calculation.nutrients, recipe.defaultServings);
    return {
      energyKcal: snapshotValue(perServing, 'ENERGY_KCAL'),
      protein: snapshotValue(perServing, 'PROTEIN'),
      carbohydrate: snapshotValue(perServing, 'CARBOHYDRATE'),
      fat: snapshotValue(perServing, 'FAT'),
    };
  } catch {
    return null;
  }
}

function snapshotValue(nutrients: Record<string, Decimal>, code: string): number {
  const amount = nutrients[code];
  return amount ? amount.toDecimalPlaces(2).toNumber() : 0;
}

function divideNutrients(
  nutrients: Record<string, Decimal>,
  servings: number,
): Record<string, Decimal> {
  const divisor = new Decimal(servings);
  return Object.fromEntries(
    Object.entries(nutrients).map(([code, amount]) => [code, amount.div(divisor)]),
  );
}
async function requireProfile(
  profiles: AdultProfileRepository,
  id: string,
  householdId: string,
): Promise<AdultProfileView> {
  const profile = await profiles.findActiveById(id);
  if (!profile || profile.householdId !== householdId || !profile.isActive)
    throw new AdultProfileNotFoundError('Active adult profile not found in this household.');
  return profile;
}
